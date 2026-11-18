import { NextResponse } from "next/server";
import { chatRooms, chatUnread, ChatError, type ChatRole } from "@/lib/family-chat";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try {const q=new URL(request.url).searchParams;return NextResponse.json(await (q.get('summary')==='1'?chatUnread:chatRooms)({viewer:(q.get('viewer')||'admin') as ChatRole,parentToken:q.get('parentToken')||undefined}),{headers:{'Cache-Control':'private, no-store'}})}
  catch(e){return NextResponse.json({error:e instanceof ChatError?e.message:'Could not load chats'},{status:e instanceof ChatError?e.status:500})}
}
