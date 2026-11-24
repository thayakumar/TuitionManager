import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyBrowserAdminSession } from "@/lib/auth";
import { authorization,createConsent,OAuthError } from "@/lib/mcp/auth";
import { decideAgentConsent } from "@/lib/mcp/admin-actions";
import { AgentConsentButtons } from "@/components/agent-consent-buttons";
export const dynamic='force-dynamic';
export default async function Authorize({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const values=await searchParams,params=new URLSearchParams();for(const[k,v]of Object.entries(values))if(typeof v==='string')params.set(k,v);let request;try{request=await authorization(params);}catch(e){return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Cannot connect this agent</h1><p className="mt-4">{e instanceof OAuthError?e.message:'Authorization is temporarily unavailable.'}</p><Link href="/dashboard">Back to workspace</Link></main>;}
if(!await verifyBrowserAdminSession())redirect('/portal/admin?next='+encodeURIComponent('/oauth/authorize?'+params.toString()));const session=(await cookies()).get('admin_session')!.value,id=await createConsent(request,session);
return <main className="mx-auto max-w-xl space-y-6 p-6 sm:p-10"><p className="font-semibold text-primary">TuitionHub · AI connection</p><h1 className="text-3xl font-bold">Connect {request.client_name}?</h1><p>You are connecting your admin workspace. This agent can read student information, lessons, classroom work, messages and financial records.{request.scope.includes('tuition:write')?' It can also perform your admin actions, including scheduling, grading, messaging and billing.':''}</p><div className="rounded-2xl border bg-card p-5"><p className="font-semibold">Return address</p><p className="mt-2 break-all text-sm">{request.redirect_uri}</p></div><p className="text-sm text-muted-foreground">You can revoke this connection at any time in Settings → AI connections.</p><form action={decideAgentConsent} className="flex flex-wrap gap-3"><input type="hidden" name="request_id" value={id}/><AgentConsentButtons/></form></main>;}
