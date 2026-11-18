import {requireAdminPage} from '@/lib/auth';
import {DiagnosticList} from '@/components/diagnostics/workspace';
export const dynamic='force-dynamic';
export default async function DiagnosticsPage(){await requireAdminPage();return <DiagnosticList/>}
