import { requireAdminPage } from "@/lib/auth";
import { getTeacherQuestionBank } from "@/lib/review/bank";
import { QuestionBankManager } from "@/components/review/question-bank-manager";

export const dynamic = "force-dynamic";

export default async function ReviewBankStudioPage() {
  await requireAdminPage();
  const initialBank = await getTeacherQuestionBank(1);
  return <QuestionBankManager initialBank={initialBank} />;
}
