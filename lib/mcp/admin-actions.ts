"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyBrowserAdminSession } from "../auth";
import { createApiKey,revokeConnection,decideConsent } from "./auth";
import { ActionValidationError } from "../action-errors";
async function browser(){if(!await verifyBrowserAdminSession())throw new ActionValidationError('Sign in to your admin account');}
export async function createAgentKey(form:FormData){await browser();const label=String(form.get('label')||''),days=Number(form.get('days')||90),scope=String(form.get('scope')||'tuition:read tuition:write');try{const result=await createApiKey(label,days,scope);revalidatePath('/settings/agents');return{success:true as const,...result};}catch{return{success:false as const,error:'Use a connection name and a valid expiry/permission.'};}}
export async function revokeAgentConnection(id:string){await browser();if(!/^[a-f0-9-]{36}$/.test(id))throw new ActionValidationError('Invalid connection');await revokeConnection(id);revalidatePath('/settings/agents');}
export async function decideAgentConsent(form:FormData){await browser();const session=(await cookies()).get('admin_session')?.value;if(!session)throw new ActionValidationError('Sign in again');let destination;try{destination=await decideConsent(String(form.get('request_id')||''),session,form.get('decision')==='approve');}catch{throw new ActionValidationError('Authorization request expired. Reconnect from your agent.');}redirect(destination);}
