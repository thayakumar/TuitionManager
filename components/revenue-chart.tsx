"use client";

type MonthData = { month: string; paid: number; outstanding: number };

function formatMonth(m: string) {
  const [, month] = m.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[parseInt(month, 10) - 1] || month} ${m.slice(2, 4)}`;
}

export function RevenueChart({
  data,
  symbol,
}: {
  data: MonthData[];
  symbol: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.paid + d.outstanding), 1);

  const chartH = 200;
  const yLabels = [
    0,
    Math.round(max / 4),
    Math.round(max / 2),
    Math.round((max * 3) / 4),
    Math.round(max),
  ];

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div
        className="flex"
        style={{ minWidth: Math.max(280, data.length * 48) }}
      >
        <div
          className="flex flex-col justify-between text-xs text-muted-foreground pr-2 py-1"
          style={{ height: chartH }}
        >
          {yLabels.reverse().map((v, index) => (
            <span key={index}>
              {symbol} {v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <div
            className="relative border-l border-b border-border"
            style={{ height: chartH }}
          >
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <div
                key={pct}
                className="absolute left-0 right-0 border-t border-dashed border-border/50"
                style={{ bottom: `${pct * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const paidH = (d.paid / max) * 100;
                const outH = (d.outstanding / max) * 100;
                return (
                  <div
                    key={d.month}
                    className="flex-1 flex justify-center items-end gap-0.5 px-1"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="w-4 bg-primary rounded-t-sm transition-all duration-500 hover:bg-primary"
                      style={{ height: `${paidH}%` }}
                      title={`Paid: ${symbol} ${d.paid.toFixed(2)}`}
                    />
                    <div
                      className="w-4 bg-[#ff9c52] rounded-t-sm transition-all duration-500 hover:bg-[#dca577]"
                      style={{ height: `${outH}%` }}
                      title={`Outstanding: ${symbol} ${d.outstanding.toFixed(2)}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex">
            {data.map((d) => (
              <div
                key={d.month}
                className="flex-1 text-center text-xs text-muted-foreground pt-1.5"
              >
                {formatMonth(d.month)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-5 mt-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          <span className="text-muted-foreground">Paid</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff9c52]" />
          <span className="text-muted-foreground">Outstanding</span>
        </span>
      </div>
    </div>
  );
}

export function RevenueTrend({
  data,
  symbol,
}: {
  data: MonthData[];
  symbol: string;
}) {
  if (!data.length)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Your monthly trend appears after your first invoice.
      </p>
    );
  const width = 640,
    height = 180,
    pad = 24,
    max = Math.max(1, ...data.map((d) => d.paid + d.outstanding));
  const points = data
    .map(
      (d, index) =>
        `${pad + (data.length === 1 ? (width - pad * 2) / 2 : (index / (data.length - 1)) * (width - pad * 2))},${height - pad - ((d.paid + d.outstanding) / max) * (height - pad * 2)}`,
    )
    .join(" ");
  return (
    <div>
      <svg
        className="h-48 w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly invoiced revenue trend"
      >
        <title>
          Revenue by billing month, including paid and outstanding invoices
        </title>
        {[0, 0.5, 1].map((p) => (
          <line
            key={p}
            x1={pad}
            x2={width - pad}
            y1={height - pad - p * (height - pad * 2)}
            y2={height - pad - p * (height - pad * 2)}
            stroke="#f9e7de"
            strokeDasharray="4 4"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#d93624"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {data.map((d, index) => {
          const [cx, cy] = points.split(" ")[index].split(",");
          return (
            <circle key={d.month} cx={cx} cy={cy} r="4" fill="#d93624">
              <title>{`${d.month}: ${symbol} ${(d.paid + d.outstanding).toFixed(2)}`}</title>
            </circle>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        {data[0].month} – {data[data.length - 1].month} · Full values appear in
        the monthly breakdown.
      </p>
    </div>
  );
}
