import {ownStudentContext} from '@/lib/portal-context';
import {DiagnosticWorkspace} from '@/components/diagnostics/workspace';
export const dynamic='force-dynamic';
export default async function StudentDiagnosticPage({params}:{params:Promise<{studentId:string}>}){const id=Number((await params).studentId);await ownStudentContext(id);return <DiagnosticWorkspace studentId={id} viewer="student"/>}
