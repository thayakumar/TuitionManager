import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { WhiteboardCanvas } from "@/components/whiteboard-canvas";
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
    <WhiteboardCanvas
      boardId="personal"
      identity="admin"
      details={
        <div className="space-y-4">
          <h1 className="text-lg font-bold">Your whiteboard</h1>
          <Link
            href="/dashboard"
            className="inline-block text-sm font-medium text-primary"
          >
            Back to workspace
          </Link>
          {boards.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Recent lesson boards</h2>
              <div className="space-y-2">
                {boards.map((b) => (
                  <Link
                    key={b.class_id}
                    href={"/meeting/" + b.class_id + "/whiteboard"}
                    className="block rounded-xl border border-border p-3 hover:bg-secondary"
                  >
                    <strong className="block text-sm">{b.name}</strong>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(b.scheduled_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      }
    />
  );
}
