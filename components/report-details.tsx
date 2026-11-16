type ReportDetailsData = {
  topics_covered: string | null;
  homework: string | null;
  performance: string | null;
  strengths: string | null;
  areas_to_improve: string | null;
  next_focus: string | null;
};

export function ReportDetails({
  report,
  subject,
}: {
  report: ReportDetailsData;
  subject?: string | null;
}) {
  const items = [
    ["Subject", subject],
    ["Topics covered", report.topics_covered],
    ["Homework", report.homework],
    ["Performance", report.performance],
    ["Strengths", report.strengths],
    ["Areas to improve", report.areas_to_improve],
    ["Next focus", report.next_focus],
  ].filter(([, value]) => value);

  return (
    <dl className="grid gap-x-8 gap-y-6 rounded-xl border border-border bg-white p-5 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="report-detail-label mb-2">{label}</dt>
          <dd className="report-detail-value whitespace-pre-wrap break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
