import { ownStudentContext } from "@/lib/portal-context";
import { getStudentReviewMap } from "@/lib/review/service";
import { StudentQuest } from "@/components/review/student-quest";

export const dynamic = "force-dynamic";

export default async function StudentReviewQuestPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const id = Number((await params).studentId);
  await ownStudentContext(id);
  const initialMap = await getStudentReviewMap(id);
  return <StudentQuest studentId={id} initialMap={initialMap} />;
}
