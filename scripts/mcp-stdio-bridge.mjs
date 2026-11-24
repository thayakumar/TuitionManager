import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema,ListResourcesRequestSchema,ReadResourceRequestSchema} from '@modelcontextprotocol/sdk/types.js';
const token=process.env.TUITIONHUB_MCP_KEY,url=process.env.TUITIONHUB_MCP_URL||'https://tuition-manager-dusky.vercel.app/api/mcp';
if(!token){console.error('Set TUITIONHUB_MCP_KEY to a key created in TuitionHub Settings → AI connections.');process.exit(1);}
const remote=new Client({name:'tuitionhub-stdio-bridge',version:'1.0.0'});
const local=new Server({name:'TuitionHub',version:'1.0.0'},{capabilities:{tools:{},resources:{}}});
try{await remote.connect(new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:'Bearer '+token}}}));local.setRequestHandler(ListToolsRequestSchema,()=>remote.listTools());local.setRequestHandler(CallToolRequestSchema,r=>remote.callTool(r.params));local.setRequestHandler(ListResourcesRequestSchema,()=>remote.listResources());local.setRequestHandler(ReadResourceRequestSchema,r=>remote.readResource(r.params));await local.connect(new StdioServerTransport());}
catch{console.error('Could not connect to TuitionHub. Check the MCP URL, key and connection expiry.');await remote.close();process.exit(1);}
async function close(){await local.close();await remote.close();process.exit(0);}
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
