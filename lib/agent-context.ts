import { AsyncLocalStorage } from "node:async_hooks";
import { validatePrincipal, type AgentPrincipal } from "./mcp/auth";
const context=new AsyncLocalStorage<AgentPrincipal>();
/** Only the authenticated MCP entry establishes this server-only request context. */
export function withAgentAdmin<T>(principal:AgentPrincipal,run:()=>Promise<T>):Promise<T>{return context.run(principal,run);}
export function agentPrincipal(){return context.getStore();}
export async function agentAdminAuthorized(){const p=context.getStore();return !!p&&await validatePrincipal(p);}
