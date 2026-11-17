import { Badge } from "@/components/ui/badge";
export type AssignmentState =
  "Assigned" | "Awaiting grading" | "Turned in" | "Graded" | "Missing";
const colors: Record<AssignmentState, string> = {
  Assigned: "border-blue-200 bg-blue-50 text-blue-800",
  "Awaiting grading": "border-amber-200 bg-amber-50 text-amber-900",
  "Turned in": "border-amber-200 bg-amber-50 text-amber-900",
  Graded: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Missing: "border-slate-300 bg-slate-100 text-slate-700",
};
export function assignmentState(
  submission: { graded_at?: string | null } | undefined | null,
  dueAt?: string | null,
): AssignmentState {
  return submission?.graded_at
    ? "Graded"
    : submission
      ? "Awaiting grading"
      : dueAt && Date.parse(dueAt) < Date.now()
        ? "Missing"
        : "Assigned";
}
export function AssignmentStatus({ status }: { status: AssignmentState }) {
  return (
    <Badge
      variant="outline"
      data-assignment-status={status}
      className={`px-3 py-1 font-semibold ${colors[status]}`}
    >
      {status}
    </Badge>
  );
}
