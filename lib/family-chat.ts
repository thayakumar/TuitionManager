import { createHash } from "crypto";
import type { Transaction, InValue } from "@libsql/client";
import { verifyAdminSession, getStudentSession } from "./auth";
import { queryAll, queryOne, withTransaction, ensureMigrated, getClient } from "./db";
import { sanitizeRichText, hasRichTextContent } from "./rich-text";
import { driveFileId } from "./attachment-url";

export type ChatRole = "admin" | "student" | "parent";
export type ChatContext = { viewer?: ChatRole; parentToken?: string };
export type ChatAttachment = { fileUrl: string; fileName: string; fileType: string };
export class ChatError extends Error {
  constructor(public status: number, message: string) { super(message); }
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
async function checkAccess(tx: Pick<Transaction,"execute">, sid: number, actor: ChatActor) {
  const students = await tx.execute({sql:"SELECT id FROM students WHERE id=? AND (?='admin' OR ?='parent' OR active=1)",args:[sid,actor.role,actor.role]});
  if (!students.rows.length || (actor.role !== "admin" && actor.studentId !== sid)) throw new ChatError(404,"Chat not found");
  if (actor.role === "parent") {
    const token = await tx.execute({sql:"SELECT id FROM share_tokens WHERE token=? AND student_id=? AND active=1",args:[actor.parentToken!,sid]});
    if (!token.rows.length) throw new ChatError(401,"This parent link is no longer active");
  }
}
async function roomFor(tx: Pick<Transaction,"execute">, sid: number, actor: ChatActor) {
  await checkAccess(tx,sid,actor);
  const room = (await tx.execute({sql:"SELECT id FROM family_chat_rooms WHERE student_id=?",args:[sid]})).rows[0];
  if (!room) throw new ChatError(404,"Chat not found");
  return Number(room.id);
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
    return {room,viewerRole:actor.role,hasMore,messages:list.map(m=>({id:Number(m.id),body:m.deleted_at?"":String(m.body),authorRole:m.author_role,authorName:m.author_role==="admin"?"Tutor":m.author_role==="parent"?"Parent":m.student_name,authorPhoto:m.author_role==="student"?m.profile_photo_url:null,isOwn:m.author_key===actor.key,canEdit:!m.deleted_at&&m.author_key===actor.key,canDelete:!m.deleted_at&&(actor.role==="admin"||m.author_key===actor.key),createdAt:m.created_at,editedAt:m.edited_at,deletedAt:m.deleted_at,attachments:m.deleted_at?[]:JSON.parse(String(m.attachments)),replyTo:m.reply_to?Number(m.reply_to):null,replyPreview:m.reply_id?{id:Number(m.reply_id),body:m.reply_deleted_at?"":String(m.reply_body),authorName:m.reply_author_role==="admin"?"Tutor":m.reply_author_role==="parent"?"Parent":m.student_name,deletedAt:m.reply_deleted_at}:null,readBy:readRows.filter(r=>Number(r.last_read_id)>=Number(m.id)).map(r=>r.actor_role)}))};
  });
}
async function verifiedAttachments(tx: Transaction, actor: ChatActor, sid:number, raw: unknown): Promise<ChatAttachment[]> {
  if (raw===undefined) return [];
  if (!Array.isArray(raw)||raw.length>20) invalid("Choose at most 20 attachments per message");
  const out: ChatAttachment[]=[];
  for (const item of raw as Array<{fileUrl?:string}>) {
    const fileId=driveFileId(item?.fileUrl);
    if (!fileId) invalid("Upload attachments using the paperclip");
    const file=(await tx.execute({sql:"SELECT owner_role,owner_student_id,file_name,mime_type,parent_token_hash FROM uploaded_files WHERE file_id=?",args:[fileId]})).rows[0];
    if (!file || (actor.role==="admin"?file.owner_role!=="admin":file.owner_role!=="student"||Number(file.owner_student_id)!==sid)) throw new ChatError(403,"This attachment does not belong to your account");
    if (actor.role === "parent" && file.parent_token_hash !== actor.key.slice(7)) throw new ChatError(403,"This attachment was not uploaded with your parent link");
    if (actor.role === "student" && file.parent_token_hash) throw new ChatError(403,"This attachment was not uploaded by your student account");
    out.push({fileUrl:"/api/files/"+fileId,fileName:String(file.file_name),fileType:String(file.mime_type)});
  }
  return out;
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
    const roomId=await roomFor(tx,sid,actor);
    if(!["send","edit","delete"].includes(data.action))invalid("Unknown chat action");
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
    const attachments=await verifiedAttachments(tx,actor,sid,data.attachments ?? (previous?JSON.parse(String(previous.attachments)):[]));
    if(!hasRichTextContent(body)&&!attachments.length)invalid("Write a message or add an attachment");
    // Inline images must pass the same ownership validation as paperclip files.
    for(const match of body.matchAll(/<img[^>]+src="([^"]+)"/g)) await verifiedAttachments(tx,actor,sid,[{fileUrl:match[1]}]);
    if(previous) {
      if(previous.body===body&&previous.attachments===JSON.stringify(attachments))return {success:true,id:Number(previous.id)};
      await tx.execute({sql:"INSERT INTO family_chat_edits(message_id,body,attachments,changed_by,changed_at,action) VALUES(?,?,?,?,?,'edit')",args:[previous.id,previous.body,previous.attachments,actor.key,now]});
      await tx.execute({sql:"UPDATE family_chat_messages SET body=?,attachments=?,edited_at=? WHERE id=?",args:[body,JSON.stringify(attachments),now,previous.id]});
      return {success:true,id:Number(previous.id)};
    }
    const clientId=String(data.clientId??"");if(!/^[A-Za-z0-9_-]{8,100}$/.test(clientId))invalid("Message identifier is invalid");
    let replyTo:number|null=null;
    if(data.replyTo){replyTo=positive(data.replyTo,"Reply");if(!(await tx.execute({sql:"SELECT id FROM family_chat_messages WHERE id=? AND room_id=?",args:[replyTo,roomId]})).rows.length)throw new ChatError(404,"Reply message not found");}
    await tx.execute({sql:"INSERT OR IGNORE INTO family_chat_messages(room_id,author_role,author_key,body,attachments,reply_to,client_id,created_at) VALUES(?,?,?,?,?,?,?,?)",args:[roomId,actor.role,actor.key,body,JSON.stringify(attachments),replyTo,clientId,now]});
    const sent=(await tx.execute({sql:"SELECT id FROM family_chat_messages WHERE room_id=? AND author_key=? AND client_id=?",args:[roomId,actor.key,clientId]})).rows[0];
    return {success:true,id:Number(sent.id)};
  });
}
