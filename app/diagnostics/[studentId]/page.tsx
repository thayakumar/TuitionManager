import {requireAdminPage} from '@/lib/auth';
import {notFound} from 'next/navigation';
import {DiagnosticWorkspace} from '@/components/diagnostics/workspace';
export const dynamic='force-dynamic';
export default async function DiagnosticPage({params}:{params:Promise<{studentId:string}>}){await requireAdminPage();const id=Number((await params).studentId);if(!Number.isSafeInteger(id)||id<1)notFound();return <DiagnosticWorkspace studentId={id} viewer="admin"/>}
