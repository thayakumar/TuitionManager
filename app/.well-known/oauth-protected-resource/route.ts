import { publicOrigin,resourceUrl,ALL_SCOPES } from "@/lib/mcp/auth";
export const dynamic='force-dynamic';
export function GET(){return Response.json({resource:resourceUrl(),authorization_servers:[publicOrigin()],scopes_supported:ALL_SCOPES.split(' '),bearer_methods_supported:['header']},{headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}
