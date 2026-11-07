"use client";

type MonthData = { month: string; paid: number; outstanding: number };

function formatMonth(m: string) {
  const [, month] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[parseInt(month, 10) - 1] || m;
}

export function RevenueChart({ data, symbol }: { data: MonthData[]; symbol: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.paid + d.outstanding), 1);
  const barWidth = 100 / data.length;
  const chartH = 200;
  const yLabels = [0, Math.round(max / 4), Math.round(max / 2), Math.round((max * 3) / 4), Math.round(max)];

  return (
    <div className="w-full">
      <div className="flex">
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-2 py-1" style={{ height: chartH }}>
          {yLabels.reverse().map((v) => (
            <span key={v}>{symbol} {v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}</span>
          ))}
        </div>
        <div className="flex-1">
          <div className="relative border-l border-b border-border" style={{ height: chartH }}>
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
                      className="w-3 bg-indigo-400 rounded-t-sm transition-all duration-500 hover:bg-indigo-500"
                      style={{ height: `${paidH}%` }}
                      title={`Paid: ${symbol} ${d.paid.toFixed(2)}`}
                    />
                    <div
                      className="w-3 bg-amber-300 rounded-t-sm transition-all duration-500 hover:bg-amber-400"
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
              <div key={d.month} className="flex-1 text-center text-[10px] text-muted-foreground pt-1.5">
                {formatMonth(d.month)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-5 mt-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-indigo-400" />
          <span className="text-muted-foreground">Paid</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="text-muted-foreground">Outstanding</span>
        </span>
      </div>
    </div>
  );
}
