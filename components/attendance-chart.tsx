"use client";

type AttendanceData = {
  present: number;
  late: number;
  absent: number;
  total: number;
};

const COLORS = [
  { label: "Present", color: "#818CF8", class: "bg-indigo-400" },
  { label: "Late", color: "#FBBF24", class: "bg-amber-400" },
  { label: "Absent", color: "#F87171", class: "bg-red-400" },
];

export function AttendanceChart({ data }: { data: AttendanceData }) {
  const { present, late, absent, total } = data;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No attendance data yet
      </div>
    );
  }

  const pct = (v: number) => Math.round((v / total) * 100);
  const presentPct = pct(present);
  const segments = [
    { value: present, color: COLORS[0].color },
    { value: late, color: COLORS[1].color },
    { value: absent, color: COLORS[2].color },
  ];

  const radius = 70;
  const stroke = 22;
  const center = 90;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="oklch(0.95 0.01 280)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => {
            if (seg.value === 0) return null;
            const pctVal = seg.value / total;
            const dashLen = pctVal * circumference;
            const gapLen = circumference - dashLen;
            const el = (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dashLen} ${gapLen}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-500"
              />
            );
            offset += dashLen;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{presentPct}%</span>
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
      </div>
      <div className="flex gap-4">
        {COLORS.map((c, i) => {
          const val = [present, late, absent][i];
          return (
            <div key={c.label} className="flex items-center gap-1.5 text-xs">
              <span className={`size-2.5 rounded-full ${c.class}`} />
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-medium text-foreground">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
