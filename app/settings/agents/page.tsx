import { requireAdminPage } from '@/lib/auth';
import { listConnections,resourceUrl } from '@/lib/mcp/auth';
import { AgentConnections } from '@/components/agent-connections';
import { PageHeader } from '@/components/page-header';
export const dynamic='force-dynamic';
export default async function AgentsPage(){await requireAdminPage();return <><PageHeader title="AI connections" subtitle="Manage TuitionHub through Hermes and other MCP-compatible agents."/><AgentConnections serverTime={Date.now()} url={resourceUrl()} connections={await listConnections() as any}/></>;}
