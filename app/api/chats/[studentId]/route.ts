import { NextResponse } from "next/server";
import { chatMessages, mutateChat, ChatError, type ChatRole } from "@/lib/family-chat";
export const dynamic="force-dynamic";
const fail=(e:unknown)=>NextResponse.json({error:e instanceof ChatError?e.message:'Could not update chat'},{status:e instanceof ChatError?e.status:500});
export async function GET(request:Request,{params}:{params:Promise<{studentId:string}>}) {
  try {const q=new URL(request.url).searchParams;return NextResponse.json(await chatMessages(Number((await params).studentId),{viewer:(q.get('viewer')||'admin') as ChatRole,parentToken:q.get('parentToken')||undefined},{before:q.has('before')?Number(q.get('before')):undefined,after:q.has('after')?Number(q.get('after')):undefined,refreshIds:q.has('refreshIds')?q.get('refreshIds')!.split(',').map(Number):undefined}),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return fail(e)}
}
export async function POST(request:Request,{params}:{params:Promise<{studentId:string}>}) {
  try {
    const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')?.split(',')[0].trim()||request.headers.get('host')||new URL(request.url).host;
    let allowedOrigin=false;try{allowedOrigin=!!origin&&new URL(origin).host===host}catch{}
 if(!allowedOrigin)throw new ChatError(403,'Chat origin is not allowed');
    const raw=await request.text();if(raw.length>200000)throw new ChatError(413,'Message is too large');
    let data;try{data=JSON.parse(raw)}catch{throw new ChatError(400,'Invalid message')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new ChatError(400,'Invalid message');
    return NextResponse.json(await mutateChat(Number((await params).studentId),data,{viewer:data.viewer||'admin',parentToken:data.parentToken}),{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return fail(e)}
}
