/** One presentation rule for lessons in calendars, dashboards and portals. */
export function lessonStatus(status: string, attendance?: string | null) {
  if (status === "canceled" || status === "cancelled")
    return {
      key: "cancelled",
      label: "Cancelled",
      color: "#64748b",
      className: "border-slate-200 bg-slate-100 text-slate-700",
      dotClassName: "bg-slate-500",
      iconClassName: "bg-slate-100 text-slate-600",
    };
  if (attendance === "absent")
    return {
      key: "absent",
      label: "Absent",
      color: "#dc2626",
      className: "border-red-200 bg-red-50 text-red-700",
      dotClassName: "bg-red-600",
      iconClassName: "bg-red-50 text-red-600",
    };
  if (status === "scheduled")
    return {
      key: "scheduled",
      label: "Scheduled",
      color: "#2563eb",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      dotClassName: "bg-blue-600",
      iconClassName: "bg-blue-50 text-blue-600",
    };
  return {
    key: "completed",
    label:
      attendance === "present" || attendance === "late"
        ? "Present"
        : "Completed",
    color: "#059669",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-600",
    iconClassName: "bg-emerald-50 text-emerald-600",
  };
}
