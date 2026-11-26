import { createHash } from "crypto";
import type { Transaction, InValue } from "@libsql/client";
import { DomainError } from "./action-errors";
import { verifyAdminSession, getStudentSession } from "./auth";
import { queryAll, queryOne, withTransaction, ensureMigrated, getClient } from "./db";
import { sanitizeRichText, hasRichTextContent } from "./rich-text";
import { driveFileId } from "./attachment-url";

export type ChatRole = "admin" | "student" | "parent";
export type ChatContext = { viewer?: ChatRole; parentToken?: string };
export type ChatAttachment = { fileUrl: string; fileName: string; fileType: string };
export class ChatError extends DomainError {
  constructor(status: number, message: string) { super(status, message); }
}
export type ChatActor = { role: ChatRole; key: string; studentId: number | null; parentToken?: string };
const invalid = (message: string): never => { throw new ChatError(400, message); };
function positive(value: unknown, label: string): number {
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) invalid(label + " is invalid"); return n;
}
export async function chatActor(context: ChatContext = {}): Promise<ChatActor> {
  const viewer = context.viewer || "admin";
  if (viewer === "admin") {
    if (!(await verifyAdminSession())) throw new ChatError(401, "Sign in to your tutor account");
    return {role:"admin",key:"admin",studentId:null};
  }
  if (viewer === "student") {
    const sid = await getStudentSession();
    if (!sid) throw new ChatError(401, "Sign in to your student account");
    const student = await queryOne("SELECT id FROM students WHERE id=? AND active=1", [sid]);
    if (!student) throw new ChatError(401, "Student access is inactive");
    return {role:"student",key:"student:"+sid,studentId:sid};
  }
  if (viewer === "parent") {
    const token = context.parentToken;
    if (!token || token.length > 512) throw new ChatError(401,"Open your active parent link");
    const row = await queryOne<{student_id:number}>("SELECT student_id FROM share_tokens WHERE token=? AND active=1",[token]);
    if (!row) throw new ChatError(401,"This parent link is no longer active");
    return {role:"parent",key:"parent:"+createHash("sha256").update(token).digest("hex"),studentId:row.student_id,parentToken:token};
  }
  throw new ChatError(400,"Unknown chat viewer");
}
type RoomDetails = { id: number; studentName: string; profilePhotoUrl: string | null };
async function roomDetailsFor(tx: Pick<Transaction,"execute">, sid: number, actor: ChatActor): Promise<RoomDetails> {
  if (actor.role !== "admin" && actor.studentId !== sid) throw new ChatError(404,"Chat not found");
  // Room, active student and revocable parent scope share one database round trip.
  const row = (await tx.execute({sql:`SELECT r.id,s.name AS studentName,s.profile_photo_url AS profilePhotoUrl,
    CASE WHEN ?='parent' THEN EXISTS(SELECT 1 FROM share_tokens t WHERE t.token=? AND t.student_id=s.id AND t.active=1) ELSE 1 END AS parentActive
    FROM family_chat_rooms r JOIN students s ON s.id=r.student_id
    WHERE r.student_id=? AND (?<>'student' OR s.active=1)`,args:[actor.role,actor.parentToken||"",sid,actor.role]})).rows[0];
  if (!row) throw new ChatError(404,"Chat not found");
  if (!row.parentActive) throw new ChatError(401,"This parent link is no longer active");
  return {id:Number(row.id),studentName:String(row.studentName),profilePhotoUrl:row.profilePhotoUrl as string|null};
}
async function roomFor(tx: Pick<Transaction,"execute">, sid: number, actor: ChatActor) {
  return (await roomDetailsFor(tx,sid,actor)).id;
}
const MESSAGE_SELECT = `SELECT m.*,s.name AS student_name,s.profile_photo_url,
  reply.id AS reply_id,reply.body AS reply_body,reply.author_role AS reply_author_role,reply.deleted_at AS reply_deleted_at
  FROM family_chat_messages m LEFT JOIN family_chat_messages reply ON reply.id=m.reply_to
  JOIN family_chat_rooms r ON r.id=m.room_id JOIN students s ON s.id=r.student_id`;
function messageView(m: Record<string, unknown>, actor: ChatActor, readRows: Array<Record<string,unknown>> = []) {
  const own=m.author_key===actor.key;
  return {id:Number(m.id),body:m.deleted_at?"":String(m.body),authorRole:m.author_role,authorName:m.author_role==="admin"?"Tutor":m.author_role==="parent"?"Parent":m.student_name,authorPhoto:m.author_role==="student"?m.profile_photo_url:null,isOwn:own,canEdit:!m.deleted_at&&own,canDelete:!m.deleted_at&&(actor.role==="admin"||own),createdAt:m.created_at,editedAt:m.edited_at||null,deletedAt:m.deleted_at||null,attachments:m.deleted_at?[]:JSON.parse(String(m.attachments)),replyTo:m.reply_to?Number(m.reply_to):null,replyPreview:m.reply_id?{id:Number(m.reply_id),body:m.reply_deleted_at?"":String(m.reply_body),authorName:m.reply_author_role==="admin"?"Tutor":m.reply_author_role==="parent"?"Parent":m.student_name,deletedAt:m.reply_deleted_at}:null,readBy:readRows.filter(r=>Number(r.last_read_id)>=Number(m.id)).map(r=>r.actor_role),...(own?{clientId:String(m.client_id)}:{})};
}
async function savedMessage(tx: Pick<Transaction,"execute">, roomId:number, actor:ChatActor, where:string, args:InValue[]) {
  const sql=MESSAGE_SELECT.replace("SELECT m.*", "SELECT m.*,(SELECT json_group_array(DISTINCT actor_role) FROM family_chat_reads cr WHERE cr.room_id=m.room_id AND cr.last_read_id>=m.id) AS read_roles");
  const row=(await tx.execute({sql:sql+" WHERE m.room_id=? AND "+where,args:[roomId,...args]})).rows[0];
  const view=row ? messageView(row,actor) : null;
  return view ? {...view,readBy:JSON.parse(String(row!.read_roles||"[]")) as ChatRole[]} : null;
}
/** Navbar polling returns an aggregate only, never room previews or message bodies. */
export async function chatUnread(context: ChatContext = {}) {
  const actor = await chatActor(context);
  const result = await queryOne<{unreadCount:number}>(`SELECT COUNT(*) AS unreadCount
    FROM family_chat_messages m
    JOIN family_chat_rooms r ON r.id=m.room_id
    LEFT JOIN family_chat_reads read ON read.room_id=r.id AND read.actor_key=?
    WHERE (?='admin' OR r.student_id=?) AND m.author_key<>?
      AND m.deleted_at IS NULL AND m.id>COALESCE(read.last_read_id,0)`,
    [actor.key,actor.role,actor.studentId,actor.key]);
  return {unreadCount:Number(result?.unreadCount||0),viewerRole:actor.role};
}
export async function chatRooms(context: ChatContext = {}) {
  const actor=await chatActor(context);
  const rooms=await queryAll<{id:number;studentId:number;studentName:string;profilePhotoUrl:string|null;lastMessage:string|null;lastMessageAt:string|null;unreadCount:number}>(`SELECT r.id,r.student_id AS studentId,s.name AS studentName,s.profile_photo_url AS profilePhotoUrl,
    (SELECT CASE WHEN m.deleted_at IS NOT NULL THEN 'Message deleted' WHEN m.body='' THEN 'Attachment' ELSE m.body END FROM family_chat_messages m WHERE m.room_id=r.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
    (SELECT created_at FROM family_chat_messages m WHERE m.room_id=r.id ORDER BY m.id DESC LIMIT 1) AS lastMessageAt,
    (SELECT COUNT(*) FROM family_chat_messages m WHERE m.room_id=r.id AND m.author_key<>? AND m.deleted_at IS NULL AND m.id>COALESCE((SELECT last_read_id FROM family_chat_reads WHERE room_id=r.id AND actor_key=?),0)) AS unreadCount
    FROM family_chat_rooms r JOIN students s ON s.id=r.student_id WHERE (?='admin' OR r.student_id=?) ORDER BY COALESCE(lastMessageAt,r.created_at) DESC,r.id DESC`,[actor.key,actor.key,actor.role,actor.studentId]);
  return {rooms,viewerRole:actor.role};
}
async function withChatRead<T>(operation:(tx:Transaction)=>Promise<T>):Promise<T> {
  await ensureMigrated();
  const tx=await getClient().transaction("read");
  try {const result=await operation(tx);await tx.commit();return result}
  catch(error){if(!tx.closed)await tx.rollback();throw error}
  finally{tx.close()}
}
export async function chatMessages(studentId: number, context: ChatContext = {}, options: {before?:number;after?:number;refreshIds?:number[]} = {}) {
  const sid=positive(studentId,"Student"), actor=await chatActor(context);
  return withChatRead(async tx=>{
    const roomId=await roomFor(tx,sid,actor);
    if (options.before && options.after) invalid("Choose one page direction");
    const cursor=options.before ?? options.after;
    if (cursor !== undefined) positive(cursor,"Page");
    const forward=options.after !== undefined;
    const refresh=options.refreshIds;
    if(refresh && (refresh.length>200 || refresh.some(n=>!Number.isSafeInteger(n)||n<1))) invalid("Invalid refresh page");
    if(refresh && cursor!==undefined) invalid("Choose one page direction");
    const refreshCondition=refresh?.length ? `AND (m.id IN (${refresh.map(()=>"?").join(",")}) OR m.id IN (SELECT id FROM family_chat_messages WHERE room_id=? ORDER BY id DESC LIMIT 50))` : "";
    const condition=refreshCondition || (cursor===undefined ? "" : forward ? "AND m.id>?" : "AND m.id<?");
    const args: InValue[]=refreshCondition ? [roomId,...refresh!,roomId] : cursor===undefined?[roomId]:[roomId,cursor];
    const rows=(await tx.execute({sql:`SELECT m.*,s.name AS student_name,s.profile_photo_url,reply.id AS reply_id,reply.body AS reply_body,reply.author_role AS reply_author_role,reply.deleted_at AS reply_deleted_at FROM family_chat_messages m LEFT JOIN family_chat_messages reply ON reply.id=m.reply_to JOIN family_chat_rooms r ON r.id=m.room_id JOIN students s ON s.id=r.student_id WHERE m.room_id=? ${condition} ORDER BY m.id ${forward ? "ASC" : "DESC"} LIMIT ${refreshCondition ? 250 : 51}`,args})).rows;
    const readRows=(await tx.execute({sql:"SELECT actor_role,MAX(last_read_id) AS last_read_id FROM family_chat_reads WHERE room_id=? GROUP BY actor_role",args:[roomId]})).rows;
    const list=refreshCondition ? rows : rows.slice(0,50);if(!forward)list.reverse();
    const hasMore=refreshCondition ? !!(await tx.execute({sql:"SELECT id FROM family_chat_messages WHERE room_id=? AND id<? LIMIT 1",args:[roomId,Number(list[0]?.id||0)]})).rows.length : rows.length>50;
    const room=(await tx.execute({sql:"SELECT s.name AS studentName,s.profile_photo_url AS profilePhotoUrl,r.id,r.student_id AS studentId FROM family_chat_rooms r JOIN students s ON s.id=r.student_id WHERE r.id=?",args:[roomId]})).rows[0];
    return {room,viewerRole:actor.role,hasMore,readPositions:readRows.map(row=>({role:row.actor_role,lastReadId:Number(row.last_read_id)})),messages:list.map(m=>messageView(m,actor,readRows))};
  });
}
async function verifiedAttachments(tx: Transaction, actor: ChatActor, sid:number, raw: unknown, inlineUrls: string[] = []): Promise<ChatAttachment[]> {
  const requested=raw===undefined?[]:raw;
  if (!Array.isArray(requested)||requested.length>20) invalid("Choose at most 20 attachments per message");
  const combined=[...(requested as Array<{fileUrl?:string}>),...inlineUrls.map(fileUrl=>({fileUrl}))];
  const ids=combined.map(item=>{const id=driveFileId(item?.fileUrl);if(!id)invalid("Upload attachments using the paperclip");return id!});
  const unique=[...new Set(ids)], files=new Map<string,Record<string,unknown>>();
  // A single lookup for a normal message, rather than a remote round trip per file/image.
  for(let offset=0;offset<unique.length;offset+=200){
    const page=unique.slice(offset,offset+200);
    const rows=(await tx.execute({sql:`SELECT file_id,owner_role,owner_student_id,file_name,mime_type,parent_token_hash FROM uploaded_files WHERE file_id IN (${page.map(()=>"?").join(",")})`,args:page})).rows;
    for(const row of rows)files.set(String(row.file_id),row);
  }
  const out:ChatAttachment[]=[];
  for(const fileId of ids){
    const file=files.get(fileId);
    if (!file || (actor.role==="admin"?file.owner_role!=="admin":file.owner_role!=="student"||Number(file.owner_student_id)!==sid)) throw new ChatError(403,"This attachment does not belong to your account");
    if (actor.role === "parent" && file.parent_token_hash !== actor.key.slice(7)) throw new ChatError(403,"This attachment was not uploaded with your parent link");
    if (actor.role === "student" && file.parent_token_hash) throw new ChatError(403,"This attachment was not uploaded by your student account");
    out.push({fileUrl:"/api/files/"+fileId,fileName:String(file.file_name),fileType:String(file.mime_type)});
  }
  return out.slice(0,(requested as unknown[]).length);
}
export async function mutateChat(studentId:number, data:{action:string;body?:unknown;messageId?:unknown;replyTo?:unknown;attachments?:unknown;clientId?:unknown;lastReadId?:unknown},context:ChatContext={}) {
  const sid=positive(studentId,"Student"),actor=await chatActor(context),now=new Date().toISOString();
  if(data.action==="read") {
    const position=await withChatRead(async tx=>{
      const roomId=await roomFor(tx,sid,actor);
      const max=Number((await tx.execute({sql:"SELECT COALESCE(MAX(id),0) AS id FROM family_chat_messages WHERE room_id=?",args:[roomId]})).rows[0].id);
      const requested=data.lastReadId===undefined?max:Number(data.lastReadId);
      if(!Number.isSafeInteger(requested)||requested<0||requested>max)invalid("Read position is invalid");
      const existing=(await tx.execute({sql:"SELECT last_read_id FROM family_chat_reads WHERE room_id=? AND actor_key=?",args:[roomId,actor.key]})).rows[0];
      return {requested,needsWrite:requested>Number(existing?.last_read_id||0)};
    });
    if(!position.needsWrite)return {success:true};
    return withTransaction(async tx=>{
      const roomId=await roomFor(tx,sid,actor);
      await tx.execute({sql:"INSERT INTO family_chat_reads(room_id,actor_key,actor_role,last_read_id,read_at) VALUES(?,?,?,?,?) ON CONFLICT(room_id,actor_key) DO UPDATE SET last_read_id=excluded.last_read_id,read_at=excluded.read_at WHERE excluded.last_read_id>last_read_id",args:[roomId,actor.key,actor.role,position.requested,now]});
      return {success:true};
    });
  }
  return withTransaction(async tx=>{
    const room=await roomDetailsFor(tx,sid,actor),roomId=room.id;
    if(!["send","edit","delete"].includes(data.action))invalid("Unknown chat action");
    const clientId=data.action==="send"?String(data.clientId??""):"";
    if(data.action==="send"){
      if(!/^[A-Za-z0-9_-]{8,100}$/.test(clientId))invalid("Message identifier is invalid");
      // Lost acknowledgements must remain retryable even if an old attachment
      // has since been removed. Re-authorize the room, then return the stored result.
      const existing=await savedMessage(tx,roomId,actor,"m.author_key=? AND m.client_id=?",[actor.key,clientId]);
      if(existing)return {success:true,id:existing.id,message:existing};
    }
    let previous: Record<string,InValue>|undefined;
    if(data.action!=="send") {
      const mid=positive(data.messageId,"Message");
      previous=(await tx.execute({sql:"SELECT * FROM family_chat_messages WHERE id=? AND room_id=?",args:[mid,roomId]})).rows[0] as Record<string,InValue>|undefined;
      if(!previous)throw new ChatError(404,"Message not found");
      if(previous.author_key!==actor.key && !(data.action==="delete"&&actor.role==="admin"))throw new ChatError(403,"You cannot change this message");
      if(previous.deleted_at)return {success:true,id:mid};
      if(data.action==="delete") {
        await tx.execute({sql:"INSERT INTO family_chat_edits(message_id,body,attachments,changed_by,changed_at,action) VALUES(?,?,?,?,?,'delete')",args:[mid,previous.body,previous.attachments,actor.key,now]});
        await tx.execute({sql:"UPDATE family_chat_messages SET deleted_at=? WHERE id=?",args:[now,mid]});
        return {success:true,id:mid};
      }
    }
    const raw=String(data.body??"");if(raw.length>50000)invalid("Message is too long");
    const normalized=raw.replace(/(<img[^>]+src=")([^"]+)(")/g, (all,prefix,url,suffix) => {
      const fid=driveFileId(url);
      return fid ? prefix+"/api/files/"+fid+"?inline=1"+suffix : all;
    });
    const body=sanitizeRichText(normalized).replace(/(?:[?&]|&amp;)parent_token=[^&"\s<>]*/g, "");
    const inlineUrls=Array.from(body.matchAll(/<img[^>]+src="([^"]+)"/g),match=>match[1]);
    const attachments=await verifiedAttachments(tx,actor,sid,data.attachments ?? (previous?JSON.parse(String(previous.attachments)):[]),inlineUrls);
    const inlineFiles=Array.from(new Set(inlineUrls.map(url=>driveFileId(url)).filter((fid):fid is string=>Boolean(fid))));
    const inlineFilesJson=JSON.stringify(inlineFiles);
    if(!hasRichTextContent(body)&&!attachments.length)invalid("Write a message or add an attachment");
    if(previous) {
      if(previous.body===body&&previous.attachments===JSON.stringify(attachments)&&String(previous.inline_files??"[]")===inlineFilesJson)return {success:true,id:Number(previous.id),message:await savedMessage(tx,roomId,actor,"m.id=?",[Number(previous.id)])};
      await tx.execute({sql:"INSERT INTO family_chat_edits(message_id,body,attachments,changed_by,changed_at,action) VALUES(?,?,?,?,?,'edit')",args:[previous.id,previous.body,previous.attachments,actor.key,now]});
      await tx.execute({sql:"UPDATE family_chat_messages SET body=?,attachments=?,inline_files=?,edited_at=? WHERE id=?",args:[body,JSON.stringify(attachments),inlineFilesJson,now,previous.id]});
      return {success:true,id:Number(previous.id),message:await savedMessage(tx,roomId,actor,"m.id=?",[Number(previous.id)])};
    }
    let replyTo:number|null=null,replyRow:Record<string,unknown>|undefined;
    if(data.replyTo){replyTo=positive(data.replyTo,"Reply");replyRow=(await tx.execute({sql:"SELECT id,body,author_role,deleted_at FROM family_chat_messages WHERE id=? AND room_id=?",args:[replyTo,roomId]})).rows[0];if(!replyRow)throw new ChatError(404,"Reply message not found");}
    const result=await tx.execute({sql:"INSERT INTO family_chat_messages(room_id,author_role,author_key,body,attachments,inline_files,reply_to,client_id,created_at) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",args:[roomId,actor.role,actor.key,body,JSON.stringify(attachments),inlineFilesJson,replyTo,clientId,now]});
    const sentId=Number(result.rows[0].id);
    const message=messageView({id:sentId,body,attachments:JSON.stringify(attachments),author_role:actor.role,author_key:actor.key,student_name:room.studentName,profile_photo_url:room.profilePhotoUrl,client_id:clientId,created_at:now,reply_to:replyTo,reply_id:replyRow?.id,reply_body:replyRow?.body,reply_author_role:replyRow?.author_role,reply_deleted_at:replyRow?.deleted_at},actor);
    return {success:true,id:sentId,message};
  });
}
