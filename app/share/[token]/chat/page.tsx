import { requireParent } from "@/lib/portal-context";
import { FamilyChat } from "@/components/family-chat";
export const dynamic = "force-dynamic";
export default async function ChatPage({params}:{params:Promise<{token:string}>}) {
  const { token } = await params;
  const student = await requireParent(token);
  return <FamilyChat role="parent" studentId={student.id} parentToken={token}/>;
}
