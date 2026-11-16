"use client";
type AttendanceData = {
  present: number;
  late?: number;
  absent: number;
  total?: number;
};
export function AttendanceChart({ data }: { data: AttendanceData }) {
  const present = Number(data.present) + Number(data.late ?? 0),
    absent = Number(data.absent),
    total = present + absent;
  if (!total)
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No marked attendance yet
      </div>
    );
  const percentage = Math.round((present / total) * 100),
    circumference = 2 * Math.PI * 64;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          width="172"
          height="172"
          viewBox="0 0 172 172"
          role="img"
          aria-label={`${percentage}% attendance; ${present} present and ${absent} absent`}
        >
          <circle
            cx="86"
            cy="86"
            r="64"
            fill="none"
            stroke="#f9e7de"
            strokeWidth="20"
          />
          <circle
            cx="86"
            cy="86"
            r="64"
            fill="none"
            stroke="#d93624"
            strokeWidth="20"
            strokeDasharray={`${(present / total) * circumference} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 86 86)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-3xl">{percentage}%</strong>
          <span className="text-xs text-muted-foreground">Attendance</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        <span>
          <i className="mr-1.5 inline-block size-2 rounded-full bg-primary" />
          Present {present}
        </span>
        <span>
          <i className="mr-1.5 inline-block size-2 rounded-full bg-slate-300" />
          Absent {absent}
        </span>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Cancelled and unmarked lessons are excluded.
      </p>
    </div>
  );
}
