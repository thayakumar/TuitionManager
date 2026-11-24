import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {publicOrigin} from '@/lib/mcp/auth';
export const dynamic='force-dynamic';
export async function GET(){const text=await readFile(path.join(process.cwd(),'docs/MCP-SETUP.md'),'utf8');return new Response(text.replaceAll('https://tuition-manager-dusky.vercel.app',publicOrigin()),{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store'}});}
