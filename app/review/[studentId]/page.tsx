import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import {
  getTeacherStudentReviewReport,
  ReviewError,
} from "@/lib/review/service";
import { TeacherStudentAnalytics } from "@/components/review/teacher-analytics";

export const dynamic = "force-dynamic";

export default async function AdminStudentReviewDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdminPage();
  const id = Number((await params).studentId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  try {
    const report = await getTeacherStudentReviewReport(id);
    return <TeacherStudentAnalytics initialReport={report} />;
  } catch (e) {
    if (e instanceof ReviewError && e.status === 404) notFound();
    throw e;
  }
}
