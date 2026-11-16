import { queryAll } from "@/lib/db";
import { requireParent } from "@/lib/portal-context";
import { PageHeader } from "@/components/page-header";
import {
  ParentReportTable,
  type ParentReport,
} from "@/components/parent-report-table";
export const dynamic = "force-dynamic";
export default async function ParentReportsPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = await paramsPromise;
  const student = await requireParent(params.token);
  const reports = await queryAll<ParentReport>(
    `SELECT r.id,r.class_id,r.topics_covered,r.homework,r.performance,r.strengths,r.areas_to_improve,r.next_focus,r.rating,c.scheduled_at,c.duration_minutes FROM reports r JOIN classes c ON c.id=r.class_id WHERE c.student_id=? ORDER BY c.scheduled_at DESC`,
    [student.id],
  );
  return (
    <>
      <PageHeader
        title="Class reports"
        subtitle={`${reports.length} lesson update${reports.length === 1 ? "" : "s"} · Open a row to read the full report`}
      />
      <ParentReportTable reports={reports} />
    </>
  );
}
