import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { WhiteboardCanvas } from "@/components/whiteboard-canvas";
import { PageHeader } from "@/components/page-header";
import { fmtDateTime } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function WhiteboardPage() {
  await requireAdminPage();
  const boards = await queryAll<{
    class_id: number;
    name: string;
    scheduled_at: string;
  }>(
    "SELECT w.class_id,s.name,c.scheduled_at FROM whiteboards w JOIN classes c ON c.id=w.class_id JOIN students s ON s.id=c.student_id ORDER BY w.updated_at DESC LIMIT 20",
  );
  return (
    <>
      <PageHeader
        title="Whiteboard"
        subtitle="Your personal canvas. Lesson boards are saved with their class notes."
      />
      <WhiteboardCanvas boardId="personal" identity="admin" />
      {boards.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">
            Recent lesson whiteboards
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {boards.map((b) => (
              <Link
                className="rounded-xl border border-border bg-card p-4 hover:bg-secondary"
                key={b.class_id}
                href={"/meeting/" + b.class_id + "/whiteboard"}
              >
                <strong className="block">{b.name}</strong>
                <span className="text-sm text-muted-foreground">
                  {fmtDateTime(b.scheduled_at)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
