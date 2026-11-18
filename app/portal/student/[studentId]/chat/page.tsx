import { ownStudentContext } from "@/lib/portal-context";
import { FamilyChat } from "@/components/family-chat";
export const dynamic = "force-dynamic";
export default async function ChatPage({params}:{params:Promise<{studentId:string}>}) {
  const { studentId } = await params;
  const student = await ownStudentContext(Number(studentId));
  return <FamilyChat role="student" studentId={student.id}/>;
}
