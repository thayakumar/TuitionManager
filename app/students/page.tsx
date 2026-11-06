import Link from "next/link";
import { Plus } from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import type { Student } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currency } from "@/lib/format";
import { ExportButton } from "@/components/export-button";
import { exportStudentsCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function StudentsPage() {
  const [students, currencySymbol] = await Promise.all([
    queryAll<Student>("SELECT * FROM students ORDER BY active DESC, name"),
    getSetting("currency"),
  ]);

  const activeCount = students.filter((s) => s.active).length;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${activeCount} active · ${students.length} total`}
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
        <Card>
          <CardHeader>
            <CardTitle>All Students</CardTitle>
            <CardDescription>
              Manage your students and view their details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/students/${s.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar size="default">
                          <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          {s.phone && (
                            <div className="text-xs text-muted-foreground">
                              {s.phone}
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {s.subject || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {s.grade_level || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(Number(s.hourly_rate), currencySymbol)}/hr
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.active ? "default" : "secondary"}>
                        {s.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
