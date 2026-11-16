import { Badge } from "@/components/ui/badge";
import { lessonStatus } from "@/lib/lesson-status";
import { cn } from "@/lib/utils";

export function LessonStatusBadge({
  status,
  attendance,
  className,
}: {
  status: string;
  attendance?: string | null;
  className?: string;
}) {
  const presentation = lessonStatus(status, attendance);
  return (
    <Badge
      variant="outline"
      data-lesson-status={presentation.key}
      className={cn(presentation.className, className)}
    >
      {presentation.label}
    </Badge>
  );
}
