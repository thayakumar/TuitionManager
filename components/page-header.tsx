import { ReactNode } from "react";
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading mb-7 flex min-w-0 flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-3">
          Your learning workspace
        </p>
        <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="no-print min-w-0 shrink-0 [&>div]:flex-wrap">
          {action}
        </div>
      )}
    </div>
  );
}
