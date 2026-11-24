import { boundedBody,noStore,oauthFailure } from "@/lib/mcp/http";
import { revokeOAuth } from "@/lib/mcp/auth";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){try{await revokeOAuth(new URLSearchParams(await boundedBody(request,16384)),request.headers);return Response.json({},{headers:noStore});}catch(e){return oauthFailure(e);}}
