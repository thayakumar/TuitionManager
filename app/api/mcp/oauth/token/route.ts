import { boundedBody,noStore,oauthFailure } from "@/lib/mcp/http";
import { exchangeToken,OAuthError } from "@/lib/mcp/auth";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){try{if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new OAuthError('invalid_request','Use form-encoded OAuth parameters');return Response.json(await exchangeToken(new URLSearchParams(await boundedBody(request,16384)),request.headers),{headers:noStore});}catch(e){return oauthFailure(e);}}
