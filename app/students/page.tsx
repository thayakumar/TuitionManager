import Link from "next/link";
import { Plus, UserCircle } from "lucide-react";
import { db } from "@/lib/db";
import type { Student } from "@/lib/types";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function StudentsPage() {
  const students = db()
    .prepare("SELECT * FROM students ORDER BY active DESC, name")
    .all() as Student[];

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.filter((s) => s.active).length} active`}
        action={
          <Link href="/students/new">
            <Button variant="primary">
              <Plus size={16} /> Add student
            </Button>
          </Link>
        }
      />

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add your first student to start scheduling classes."
          action={
            <Link href="/students/new">
              <Button variant="primary">
                <Plus size={16} /> Add student
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <Card className="hover:border-brand-500 hover:shadow-sm transition cursor-pointer">
                <div className="flex items-start gap-3">
                  <UserCircle className="text-slate-400 shrink-0" size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900 truncate">{s.name}</div>
                      {!s.active && <Badge tone="slate">inactive</Badge>}
                    </div>
                    <div className="text-sm text-slate-500">
                      {s.subject || "—"} {s.grade_level && `· ${s.grade_level}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {currency(s.hourly_rate)} / hr
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
