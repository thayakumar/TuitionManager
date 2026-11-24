import {notificationFeed} from '@/lib/notification-feed';
import {ChatError} from '@/lib/family-chat';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const q=new URL(request.url).searchParams;return Response.json(await notificationFeed({viewer:q.get('viewer')||'auto',parentToken:q.get('parentToken')||undefined,scope:q.get('scope')||undefined,notification:q.has('notification')?Number(q.get('notification')):undefined,chat:q.has('chat')?Number(q.get('chat')):undefined}),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return Response.json({error:e instanceof ChatError?e.message:'Could not check notifications'},{status:e instanceof ChatError?e.status:500,headers:{'Cache-Control':'private, no-store'}})}}
