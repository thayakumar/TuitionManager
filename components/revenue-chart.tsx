"use client";

type MonthData = { month: string; paid: number; outstanding: number };

export function RevenueChart({ data, symbol }: { data: MonthData[]; symbol: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.paid + d.outstanding), 1);

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d) => {
        const paidH = (d.paid / max) * 100;
        const outH = (d.outstanding / max) * 100;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
              {d.outstanding > 0 && (
                <div
                  className="w-full bg-accent/60 rounded-t"
                  style={{ height: `${outH}%` }}
                  title={`Outstanding: ${symbol} ${d.outstanding.toFixed(2)}`}
                />
              )}
              {d.paid > 0 && (
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${paidH}%` }}
                  title={`Paid: ${symbol} ${d.paid.toFixed(2)}`}
                />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">{d.month}</div>
          </div>
        );
      })}
    </div>
  );
}
