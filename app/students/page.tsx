import Link from "next/link";
import {
  Plus, Users, UserCheck, UserX, Wallet, BookOpen,
  GraduationCap, ArrowRight, Phone,
} from "lucide-react";
import { queryAll, getSetting } from "@/lib/db";
import type { Student } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { AddStudentDialog } from "@/components/add-student-dialog";

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
  const inactiveCount = students.length - activeCount;
  const avgRate =
    students.length > 0
      ? students.reduce((sum, s) => sum + Number(s.hourly_rate), 0) / students.length
      : 0;

  const statCards = [
    {
      label: "Total Students",
      value: students.length,
      icon: Users,
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Active",
      value: activeCount,
      icon: UserCheck,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: UserX,
      bg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      label: "Avg. Rate",
      value: currency(avgRate, currencySymbol) + "/hr",
      icon: Wallet,
      bg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
  ];

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${activeCount} active · ${students.length} total`}
        action={
          <div className="flex gap-2">
            <ExportButton getData={exportStudentsCsv} filename="students.csv" />
            <AddStudentDialog />
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <Card key={card.label} className="shadow-sm border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{card.value}</p>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon size={20} className={card.iconColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add your first student to start scheduling classes."
          action={<AddStudentDialog />}
        />
      ) : (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-indigo-500" />
                  All Students
                </CardTitle>
                <CardDescription>
                  Manage your students and view their details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Student</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} className="text-muted-foreground" />
                      Subject
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-muted-foreground" />
                      Grade
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center gap-1.5 justify-end">
                      <Wallet size={14} className="text-muted-foreground" />
                      Rate
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer group transition-colors hover:bg-indigo-50/50"
                  >
                    <TableCell>
                      <Link
                        href={`/students/${s.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="border-2 border-transparent group-hover:border-indigo-200 transition-colors">
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-semibold">
                            {getInitials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium group-hover:text-indigo-600 transition-colors">
                            {s.name}
                          </div>
                          {s.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone size={10} />
                              {s.phone}
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.subject ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {s.subject}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {s.grade_level ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          {s.grade_level}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-foreground">
                        {currency(Number(s.hourly_rate), currencySymbol)}
                      </span>
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-0 hover:bg-red-100">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
