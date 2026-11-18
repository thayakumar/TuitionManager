export type OutboxAttachment = {fileUrl:string;fileName:string;fileType?:string};
export type OutboxItem = {
  clientId:string; studentId:number; body:string; attachments:OutboxAttachment[];
  replyTo:number|null; replyPreview?:{id:number;body?:string;authorName?:string}|null;
  createdAt:string; status:'queued'|'sending'|'failed'; error?:string;
};
/** Persist only a tab's own drafts; never persist a parent bearer in image URLs. */
export function privateChatBody(body:string) {
  return body.replace(/(?:[?&]|&amp;)parent_token=[^&"\s<>]*/g,'');
}
export function restoreOutbox(raw:string|null):OutboxItem[] {
  if(!raw)return [];
  try {
    const rows:unknown=JSON.parse(raw);
    if(!Array.isArray(rows))return [];
    return rows.filter((m):m is OutboxItem=>!!m&&typeof m==='object'&&
      typeof m.clientId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(m.clientId)&&
      Number.isSafeInteger(m.studentId)&&m.studentId>0&&typeof m.body==='string'&&
      Array.isArray(m.attachments)&&m.attachments.every((a:OutboxAttachment)=>a&&typeof a.fileUrl==='string'&&typeof a.fileName==='string')&&
      typeof m.createdAt==='string'&&Number.isFinite(Date.parse(m.createdAt))
    ).map(m=>({...m,body:privateChatBody(m.body),status:'failed',error:'Delivery was interrupted. Retry to confirm this message.'}));
  } catch {return []}
}
export function reconcileOutbox(items:OutboxItem[],studentId:number,confirmedClientIds:string[]) {
  const confirmed=new Set(confirmedClientIds);
  return items.filter(m=>m.studentId!==studentId||!confirmed.has(m.clientId));
}
