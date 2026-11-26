import { ownStudentContext } from "@/lib/portal-context";
import { FamilyChat } from "@/components/family-chat";
import { PageHeader } from "@/components/page-header";
export const dynamic = "force-dynamic";
export default async function ChatPage({params}:{params:Promise<{studentId:string}>}) {
  const { studentId } = await params;
  const student = await ownStudentContext(Number(studentId));
  return (
    <>
      <PageHeader
        title="Family chat"
        subtitle="Direct messages with your tutor and family"
      />
      <FamilyChat role="student" studentId={student.id}/>
    </>
  );
}
