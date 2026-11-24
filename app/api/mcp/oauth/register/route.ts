import { boundedBody,noStore,oauthFailure } from "@/lib/mcp/http";
import { registerClient,OAuthError } from "@/lib/mcp/auth";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){try{let input;try{input=JSON.parse(await boundedBody(request,16384));}catch(e){if(e instanceof OAuthError)throw e;throw new OAuthError('invalid_client_metadata','Expected JSON client metadata');}if(!input||typeof input!=='object'||Array.isArray(input))throw new OAuthError('invalid_client_metadata','Expected an object');const result=await registerClient(input,request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown');return Response.json(result,{status:201,headers:noStore});}catch(e){return oauthFailure(e);}}
