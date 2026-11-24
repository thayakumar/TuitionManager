import {verifyBrowserAdminSession,getStudentSession} from './auth';
import {chatActor,ChatError,type ChatRole} from './family-chat';
import {queryOne,queryAll} from './db';
import {richTextPlainText} from './rich-text';
export type AlertNotice={id:number;kind:'notification'|'chat';title:string;message:string;href:string};
export type AlertCursor={notification:number;chat:number};
export async function notificationFeed(input:{viewer?:string;parentToken?:string;scope?:string;notification?:number;chat?:number}){
  let viewer=input.viewer||'auto';
  if(viewer==='auto')viewer=await verifyBrowserAdminSession()?'admin':await getStudentSession()?'student':'';
  if(!['admin','student','parent'].includes(viewer))throw new ChatError(401,'Sign in to see notifications');
  const actor=await chatActor({viewer:viewer as ChatRole,parentToken:input.parentToken});
  const scope=actor.key,recipient=actor.role==='admin'?null:actor.studentId;
  const notificationWhere=actor.role==='admin'?"recipient_type='admin'":"recipient_type='student' AND recipient_id=?";
  const notificationArgs=actor.role==='admin'?[]:[recipient!];
  const chatWhere="(?='admin' OR r.student_id=?)";
  const [notes,chat]=await Promise.all([
    actor.role==='parent'?Promise.resolve({latest:0,unread:0}):queryOne<{latest:number;unread:number}>(`SELECT COALESCE(MAX(id),0) latest,COALESCE(SUM(read=0),0) unread FROM notifications WHERE ${notificationWhere}`,notificationArgs),
    queryOne<{latest:number;unread:number}>(`SELECT COALESCE(MAX(m.id),0) latest,COALESCE(SUM(m.author_key<>? AND m.deleted_at IS NULL AND m.id>COALESCE(cr.last_read_id,0)),0) unread FROM family_chat_messages m JOIN family_chat_rooms r ON r.id=m.room_id LEFT JOIN family_chat_reads cr ON cr.room_id=r.id AND cr.actor_key=? WHERE ${chatWhere}`,[actor.key,actor.key,actor.role,recipient])
  ]);
  const latest={notification:Number(notes?.latest||0),chat:Number(chat?.latest||0)};
  const baseline=input.scope!==scope||input.notification===undefined||input.chat===undefined;
  if(baseline)return{scope,role:actor.role,baseline:true,cursor:latest,unreadCount:Number(notes?.unread||0),chatUnreadCount:Number(chat?.unread||0),notices:[] as AlertNotice[],hasMore:false};
  const n=input.notification!,c=input.chat!;
  for(const id of[n,c])if(!Number.isSafeInteger(id)||id<0)throw new ChatError(400,'Invalid notification cursor');
  const [newNotes,newChats]=await Promise.all([
    actor.role!=='parent'&&latest.notification>n?queryAll<{id:number;title:string;message:string;link:string|null}>(`SELECT id,title,message,link FROM notifications WHERE ${notificationWhere} AND id>? AND read=0 ORDER BY id LIMIT 20`,[...notificationArgs,n]):Promise.resolve([]),
    latest.chat>c?queryAll<{id:number;student_id:number;student_name:string;author_role:string;body:string;has_attachment:number}>(`SELECT m.id,r.student_id,s.name student_name,m.author_role,m.body,CASE WHEN m.attachments<>'[]' THEN 1 ELSE 0 END has_attachment FROM family_chat_messages m JOIN family_chat_rooms r ON r.id=m.room_id JOIN students s ON s.id=r.student_id LEFT JOIN family_chat_reads cr ON cr.room_id=r.id AND cr.actor_key=? WHERE ${chatWhere} AND m.id>? AND m.author_key<>? AND m.deleted_at IS NULL AND m.id>COALESCE(cr.last_read_id,0) ORDER BY m.id LIMIT 20`,[actor.key,actor.role,recipient,c,actor.key]):Promise.resolve([])
  ]);
  const inbox=actor.role==='admin'?'/notifications':`/portal/student/${recipient}/notifications`;
  const notices:AlertNotice[]=[...newNotes.map(row=>({id:Number(row.id),kind:'notification' as const,title:row.title,message:richTextPlainText(row.message).slice(0,220),href:row.link||inbox})),...newChats.map(row=>({id:Number(row.id),kind:'chat' as const,title:(row.author_role==='admin'?'Tutor':row.author_role==='parent'?(actor.role==='admin'?`Parent · ${row.student_name}`:'Parent'):row.student_name)+' sent a message',message:richTextPlainText(row.body).slice(0,220)||(row.has_attachment?'Shared an attachment':'New message'),href:actor.role==='admin'?`/chats/${row.student_id}`:actor.role==='parent'?`/share/${encodeURIComponent(input.parentToken!)}/chat`:`/portal/student/${recipient}/chat`}))];
  const cursor={notification:newNotes.length===20?Number(newNotes.at(-1)!.id):latest.notification,chat:newChats.length===20?Number(newChats.at(-1)!.id):latest.chat};
  return{scope,role:actor.role,baseline:false,cursor,unreadCount:Number(notes?.unread||0),chatUnreadCount:Number(chat?.unread||0),notices,hasMore:cursor.notification<latest.notification||cursor.chat<latest.chat};
}
