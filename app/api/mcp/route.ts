import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateAgent,resourceUrl,publicOrigin } from '@/lib/mcp/auth';
import { noStore,permittedOrigin } from '@/lib/mcp/http';
import { createMcpServer } from '@/lib/mcp/server';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request:Request){
  if(!permittedOrigin(request)||new URL(request.url).host!==new URL(publicOrigin()).host)return Response.json({error:'Origin is not allowed'},{status:403,headers:noStore});
  const principal=await authenticateAgent(request.headers.get('authorization'));
  if(!principal)return Response.json({error:'invalid_token',message:'Connect using OAuth or a key from Settings → AI connections.'},{status:401,headers:{...noStore,'WWW-Authenticate':`Bearer resource_metadata="${publicOrigin()}/.well-known/oauth-protected-resource/api/mcp"`}});
  const server=createMcpServer(principal),transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,maxRequestBodySize:4*1024*1024});
  try{await server.connect(transport);const response=await transport.handleRequest(request,{authInfo:{token:'[verified]',clientId:principal.connectionId,scopes:principal.scopes,resource:new URL(resourceUrl())}});response.headers.set('Cache-Control','private, no-store');return response;}finally{await server.close();}
}
export function GET(){return new Response('Use stateless Streamable HTTP POST.',{status:405,headers:{Allow:'POST'}});}
export const DELETE=GET;
