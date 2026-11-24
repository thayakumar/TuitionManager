import crypto from "node:crypto";
import {ActionValidationError,actionError} from "../action-errors";
import type { Transaction, InValue } from "@libsql/client";
import { execute, queryOne, queryAll, withTransaction } from "../db";
export const ALL_SCOPES = "tuition:read tuition:write";
export type AgentPrincipal = { connectionId:string; tokenHash:string; scopes:string[] };
export class OAuthError extends Error {
  constructor(public code:string, message:string, public status=400){super(message);}
}
export const digest = (value:string) => crypto.createHash("sha256").update(value).digest("hex");
const random = () => crypto.randomBytes(32).toString("base64url");
const now = () => Date.now();
export function publicOrigin() {
  const value=process.env.MCP_PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://"+process.env.VERCEL_PROJECT_PRODUCTION_URL : "https://tuition-manager-dusky.vercel.app");
  const url=new URL(value);
  if(url.username||url.password||!(url.protocol==="https:"||(url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname))))throw new Error("MCP_PUBLIC_URL must be HTTPS (or loopback HTTP)");
  return url.origin;
}
export const resourceUrl = () => publicOrigin()+"/api/mcp";
export function scopes(value:unknown):string {
  const items=[...new Set(String(value||ALL_SCOPES).split(/\s+/).filter(Boolean))];
  if(!items.length||items.some(s=>!ALL_SCOPES.split(" ").includes(s)))throw new OAuthError("invalid_scope","Unsupported permission scope");
  if(items.includes("tuition:write")&&!items.includes("tuition:read"))items.unshift("tuition:read");
  return items.sort().join(" ");
}
export async function validatePrincipal(p:AgentPrincipal):Promise<boolean> {
  const row=await queryOne<{scope:string;resource:string}>(`SELECT c.scope,t.resource FROM mcp_tokens t JOIN mcp_connections c ON c.id=t.connection_id
    WHERE t.hash=? AND t.connection_id=? AND t.kind IN ('access','key') AND t.expires_at>? AND c.expires_at>? AND c.revoked_at IS NULL`,[p.tokenHash,p.connectionId,now(),now()]);
  return !!row&&row.resource===resourceUrl()&&row.scope.split(" ").sort().join(" ")===p.scopes.slice().sort().join(" ");
}
export async function authenticateAgent(value:string|null):Promise<AgentPrincipal|null> {
  if(!value||!/^Bearer [A-Za-z0-9_-]{35,200}$/i.test(value))return null;
  const hash=digest(value.slice(7));
  const row=await queryOne<{connection_id:string;scope:string}>(`SELECT t.connection_id,c.scope FROM mcp_tokens t JOIN mcp_connections c ON c.id=t.connection_id
    WHERE t.hash=? AND t.kind IN ('key','access') AND t.resource=? AND t.expires_at>? AND c.expires_at>? AND c.revoked_at IS NULL`,[hash,resourceUrl(),now(),now()]);
  return row?{connectionId:row.connection_id,tokenHash:hash,scopes:row.scope.split(" ")}:null;
}
export async function requireScope(p:AgentPrincipal,scope:string) {
  if(!p.scopes.includes(scope))throw new OAuthError("insufficient_scope","This connection does not have "+scope,403);
  if(!await validatePrincipal(p))throw new OAuthError("invalid_token","Connection expired or revoked",401);
}
export async function listConnections(){return queryAll("SELECT id,label,kind,scope,created_at,expires_at,revoked_at FROM mcp_connections ORDER BY created_at DESC");}
export async function revokeConnection(id:string){await execute("UPDATE mcp_connections SET revoked_at=? WHERE id=?",[now(),id]);}
export async function createApiKey(label:string,days=90,scope=ALL_SCOPES) {
  if(!label.trim()||label.length>100||![7,30,90,365].includes(days))throw new Error("Choose a name and valid expiry");
  const id=crypto.randomUUID(),token="thk_"+random(),expires=now()+days*86400000,permission=scopes(scope);
  await withTransaction(async tx=>{
    await tx.execute({sql:"INSERT INTO mcp_connections(id,label,kind,scope,created_at,expires_at)VALUES(?,?,'key',?,?,?)",args:[id,label.trim(),permission,now(),expires]});
    await tx.execute({sql:"INSERT INTO mcp_tokens(hash,connection_id,kind,resource,expires_at)VALUES(?,?,'key',?,?)",args:[digest(token),id,resourceUrl(),expires]});
  });
  return {id,token,expires_at:expires};
}
type Client={client_id:string;client_name:string;redirect_uris:string[];token_endpoint_auth_method:string};
function validRedirect(value:string) {
  const u=new URL(value);
  if(u.hash||u.username||u.password||u.href.length>2048||value!==value.trim()||/[\u0000-\u0020]/.test(value))throw Error();
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(u.hostname)))throw Error();
  return value;
}
async function limited(tx:Transaction,key:string,limit:number) {
  const window=Math.floor(now()/3600000);
  await tx.execute({sql:"INSERT INTO mcp_limits(key,window,count)VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window",args:[key,window]});
  const row=(await tx.execute({sql:"SELECT count FROM mcp_limits WHERE key=?",args:[key]})).rows[0];
  if(Number(row.count)>limit)throw new OAuthError("temporarily_unavailable","Too many requests",429);
}
export async function registerClient(input:Record<string,unknown>,ip:string) {
  let redirects:string[];
  try { if(!Array.isArray(input.redirect_uris)||!input.redirect_uris.length||input.redirect_uris.length>10)throw Error();redirects=input.redirect_uris.map(v=>validRedirect(String(v))); }
  catch {throw new OAuthError("invalid_redirect_uri","Register exact HTTPS or loopback redirect URIs");}
  const method=String(input.token_endpoint_auth_method||"none");
  if(!["none","client_secret_post","client_secret_basic"].includes(method))throw new OAuthError("invalid_client_metadata","Unsupported client authentication method");
  if(input.grant_types&&(!Array.isArray(input.grant_types)||input.grant_types.some(v=>!["authorization_code","refresh_token"].includes(String(v)))))throw new OAuthError("invalid_client_metadata","Unsupported grant type");
  const client:Client={client_id:crypto.randomUUID(),client_name:String(input.client_name||"AI agent").slice(0,100),redirect_uris:redirects,token_endpoint_auth_method:method};
  const secret=method==="none"?null:random();
  await withTransaction(async tx=>{
    await limited(tx,"registration:global",200);await limited(tx,"registration:"+digest(ip),30);
    await tx.execute({sql:"INSERT INTO mcp_clients(id,data,secret_hash,created_at)VALUES(?,?,?,?)",args:[client.client_id,JSON.stringify(client),secret?digest(secret):null,now()]});
  });
  return {...client,grant_types:["authorization_code","refresh_token"],response_types:["code"],client_id_issued_at:Math.floor(now()/1000),...(secret?{client_secret:secret,client_secret_expires_at:0}:{})};
}
async function client(id:string):Promise<Client> {
  const row=await queryOne<{data:string}>("SELECT data FROM mcp_clients WHERE id=?",[id]);
  if(!row)throw new OAuthError("invalid_client","Unknown client",401);
  return JSON.parse(row.data);
}
export type Authorization = {client_id:string;client_name:string;redirect_uri:string;scope:string;state:string;resource:string;challenge:string};
export async function authorization(params:URLSearchParams):Promise<Authorization> {
  const c=await client(params.get("client_id")||"");
  const redirect=params.get("redirect_uri")||"";
  if(!c.redirect_uris.includes(redirect))throw new OAuthError("invalid_request","Redirect URI does not match the registered client");
  if(params.get("response_type")!=="code"||params.get("code_challenge_method")!=="S256"||!/^[-\w]{43}$/.test(params.get("code_challenge")||""))throw new OAuthError("invalid_request","Authorization code with S256 PKCE is required");
  if((params.get("state")||"").length>4096)throw new OAuthError("invalid_request","State is too long");
  const resource=params.get("resource")||resourceUrl();
  if(resource!==resourceUrl())throw new OAuthError("invalid_target","Wrong MCP resource");
  return {client_id:c.client_id,client_name:c.client_name,redirect_uri:redirect,scope:scopes(params.get("scope")),state:params.get("state")||"",resource,challenge:params.get("code_challenge")!};
}
export async function createConsent(request:Authorization,sessionToken:string) {
  const id=random();
  await execute("INSERT INTO mcp_authorizations(id,data,session_hash,expires_at)VALUES(?,?,?,?)",[digest(id),JSON.stringify(request),digest(sessionToken),now()+600000]);
  return id;
}
export async function decideConsent(id:string,sessionToken:string,approve:boolean) {
  return withTransaction(async tx=>{
    const row=(await tx.execute({sql:"SELECT * FROM mcp_authorizations WHERE id=?",args:[digest(id)]})).rows[0];
    if(!row||row.used_at||Number(row.expires_at)<=now()||row.session_hash!==digest(sessionToken))throw new OAuthError("invalid_request","Authorization request expired; reconnect your agent");
    const request=JSON.parse(String(row.data)) as Authorization;
    await tx.execute({sql:"UPDATE mcp_authorizations SET used_at=? WHERE id=?",args:[now(),digest(id)]});
    const url=new URL(request.redirect_uri);if(request.state)url.searchParams.set("state",request.state);
    if(!approve){url.searchParams.set("error","access_denied");return url.href;}
    const connectionId=crypto.randomUUID(),code=random();
    await tx.execute({sql:"INSERT INTO mcp_connections(id,label,kind,scope,created_at,expires_at)VALUES(?,?,'oauth',?,?,?)",args:[connectionId,request.client_name,request.scope,now(),now()+30*86400000]});
    await tx.execute({sql:"INSERT INTO mcp_codes(hash,data,expires_at)VALUES(?,?,?)",args:[digest(code),JSON.stringify({...request,connectionId}),now()+300000]});
    url.searchParams.set("code",code);return url.href;
  });
}
async function verifyClient(input:URLSearchParams,headers:Headers) {
  let id=input.get("client_id")||"",secret=input.get("client_secret")||"",method=secret?"client_secret_post":"none";
  const basic=headers.get("authorization");
  if(basic){try{if(!/^Basic /i.test(basic)||input.has("client_secret"))throw Error();const pair=Buffer.from(basic.slice(6),"base64").toString(),split=pair.indexOf(":");if(split<1)throw Error();const basicId=decodeURIComponent(pair.slice(0,split));if(id&&id!==basicId)throw Error();id=basicId;secret=decodeURIComponent(pair.slice(split+1));method="client_secret_basic";}catch{throw new OAuthError("invalid_client","Client authentication failed",401);}}
  const c=await client(id),row=await queryOne<{secret_hash:string|null}>("SELECT secret_hash FROM mcp_clients WHERE id=?",[id]);
  if(c.token_endpoint_auth_method!==method||(row?.secret_hash&&digest(secret)!==row.secret_hash))throw new OAuthError("invalid_client","Client authentication failed",401);
  return c;
}
export async function exchangeToken(input:URLSearchParams,headers:Headers) {
  const c=await verifyClient(input,headers),grant=input.get("grant_type"),resource=input.get("resource")||resourceUrl();
  if(resource!==resourceUrl())throw new OAuthError("invalid_target","Wrong MCP resource");
  return withTransaction(async tx=>{
    let data:{connectionId:string;scope:string;resource:string;client_id:string};
    if(grant==="authorization_code") {
      const row=(await tx.execute({sql:"SELECT * FROM mcp_codes WHERE hash=?",args:[digest(input.get("code")||"")]})).rows[0];
      if(!row||Number(row.expires_at)<=now())throw new OAuthError("invalid_grant","Invalid or expired authorization code");
      const request=JSON.parse(String(row.data)) as Authorization&{connectionId:string};
      const verifier=input.get("code_verifier")||"";
      const challenge=crypto.createHash("sha256").update(verifier).digest("base64url");
      if(request.client_id!==c.client_id||request.redirect_uri!==input.get("redirect_uri")||request.resource!==resource||!/^[-.\w~]{43,128}$/.test(verifier)||challenge!==request.challenge||row.used_at)throw new OAuthError("invalid_grant","Authorization code proof is invalid or already used");
      await tx.execute({sql:"UPDATE mcp_codes SET used_at=? WHERE hash=?",args:[now(),row.hash]});
      data=request;
    } else if(grant==="refresh_token") {
      const row=(await tx.execute({sql:"SELECT t.*,c.scope,c.revoked_at,c.expires_at AS connection_expiry FROM mcp_tokens t JOIN mcp_connections c ON c.id=t.connection_id WHERE hash=? AND t.kind='refresh'",args:[digest(input.get("refresh_token")||"")]})).rows[0];
      if(!row||row.client_id!==c.client_id||row.resource!==resource||Number(row.expires_at)<=now()||row.revoked_at||Number(row.connection_expiry)<=now())throw new OAuthError("invalid_grant","Refresh token expired or revoked");
      if(row.used_at){await tx.execute({sql:"UPDATE mcp_connections SET revoked_at=? WHERE id=?",args:[now(),row.connection_id]});return {replay:true} as const;}
      await tx.execute({sql:"UPDATE mcp_tokens SET used_at=? WHERE hash=?",args:[now(),row.hash]});
      if(input.get("scope")&&scopes(input.get("scope"))!==row.scope)throw new OAuthError("invalid_scope","Reconnect to change permissions");
      data={connectionId:String(row.connection_id),client_id:c.client_id,resource,scope:String(row.scope)};
    } else throw new OAuthError("unsupported_grant_type","Unsupported grant type");
    const active=(await tx.execute({sql:"SELECT id FROM mcp_connections WHERE id=? AND revoked_at IS NULL AND expires_at>?",args:[data.connectionId,now()]})).rows[0];
    if(!active)throw new OAuthError("invalid_grant","Connection revoked");
    const access="tha_"+random(),refresh="thr_"+random();
    await tx.batch([{sql:"INSERT INTO mcp_tokens(hash,connection_id,kind,client_id,resource,expires_at)VALUES(?,?,'access',?,?,?)",args:[digest(access),data.connectionId,c.client_id,resource,now()+3600000]},{sql:"INSERT INTO mcp_tokens(hash,connection_id,kind,client_id,resource,expires_at)VALUES(?,?,'refresh',?,?,?)",args:[digest(refresh),data.connectionId,c.client_id,resource,now()+30*86400000]}]);
    return {access_token:access,token_type:"Bearer",expires_in:3600,refresh_token:refresh,scope:data.scope};
  }).then(value=>{if('replay'in value)throw new OAuthError("invalid_grant","Refresh token replayed; reconnect the agent");return value;});
}
export async function revokeOAuth(input:URLSearchParams,headers:Headers) {
  const c=await verifyClient(input,headers);
  const row=await queryOne<{connection_id:string}>("SELECT connection_id FROM mcp_tokens WHERE hash=? AND client_id=?",[digest(input.get("token")||""),c.client_id]);
  if(row)await revokeConnection(row.connection_id);
}
export async function audit(p:AgentPrincipal,operation:string,status:string){await execute("INSERT INTO mcp_audit(connection_id,operation,status,created_at)VALUES(?,?,?,?)",[p.connectionId,operation,status,now()]);}
export async function operationResult(p:AgentPrincipal,id:string){const row=await queryOne<{operation:string;status:string;result:string|null;created_at:number}>("SELECT operation,status,result,created_at FROM mcp_operations WHERE connection_id=? AND request_id=?",[p.connectionId,id]);return row?{...row,result:row.result?JSON.parse(row.result):null}:{status:"not_found",request_id:id};}
export async function runMutation(p:AgentPrincipal,id:string,operation:string,input:unknown,run:()=>Promise<unknown>) {
  if(!/^[\w.-]{8,128}$/.test(id))throw new ActionValidationError("Provide a stable request_id (8–128 letters, digits, dots, underscores or hyphens)");
  const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,stable(v)])):value;
  const hash=digest(JSON.stringify(stable({operation,input})));
  const previous=await withTransaction(async tx=>{
    const row=(await tx.execute({sql:"SELECT * FROM mcp_operations WHERE connection_id=? AND request_id=?",args:[p.connectionId,id]})).rows[0];
    if(row)return row;
    await tx.execute({sql:"INSERT INTO mcp_operations(connection_id,request_id,input_hash,operation,status,created_at)VALUES(?,?,?,?,'running',?)",args:[p.connectionId,id,hash,operation,now()]});
    return null;
  });
  if(previous){if(previous.input_hash!==hash)throw new ActionValidationError("request_id was already used for different input");if(previous.status==='running')throw new ActionValidationError("Operation in progress or outcome uncertain. Check operation_status and current app data before another attempt.");const result=JSON.parse(String(previous.result));if(previous.status==='error')throw new ActionValidationError(result.error);return result;}
  let completed=false;
  try {
    const result=(await run())??{success:true};
    completed=true;
    await execute("UPDATE mcp_operations SET status='success',result=? WHERE connection_id=? AND request_id=?",[JSON.stringify(result),p.connectionId,id]);
    await audit(p,operation,"success").catch(()=>{});return result;
  }catch(error){if(completed)throw new ActionValidationError("Outcome uncertain. Check operation_status and current app data; do not repeat with a new request_id.");const message=actionError(error,"The operation failed. Inspect its request_id and current app data before retrying.");await execute("UPDATE mcp_operations SET status='error',result=? WHERE connection_id=? AND request_id=?",[JSON.stringify({error:message}),p.connectionId,id]);await audit(p,operation,"error").catch(()=>{});throw error;}
}
