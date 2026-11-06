import Link from "next/link";
import { Plus, UserCircle } from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import type { Student } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency } from "@/lib/format";
import { ExportButton } from "@/components/export-button";
import { exportStudentsCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const [students, currencySymbol] = await Promise.all([
    queryAll<Student>("SELECT * FROM students ORDER BY active DESC, name"),
    getSetting("currency"),
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.filter((s) => s.active).length} active`}
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportStudentsCsv} filename="students.csv" />
            <Link href="/students/new">
              <Button>
                <Plus size={16} /> Add student
              </Button>
            </Link>
          </div>
        }
      />

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add your first student to start scheduling classes."
          action={
            <Link href="/students/new">
              <Button>
                <Plus size={16} /> Add student
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <Card className="hover:border-primary hover:shadow-sm transition cursor-pointer">
                <CardContent className="flex items-start gap-3 pt-5">
                  <UserCircle className="text-muted-foreground shrink-0" size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground truncate">{s.name}</div>
                      {!s.active && <Badge variant="secondary">inactive</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {s.subject || "—"} {s.grade_level && `· ${s.grade_level}`}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      {currency(Number(s.hourly_rate), currencySymbol)} / hr
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
