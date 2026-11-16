import { Sprout } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center px-6 py-14 border border-border rounded-2xl bg-card">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Sprout size={26} strokeWidth={1.5} /></div>
      <div className="text-foreground font-medium">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
