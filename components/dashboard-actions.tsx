"use client";

import { CalendarPlus, Users, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddStudentDialog } from "@/components/add-student-dialog";
import { ScheduleClassDialog } from "@/components/schedule-class-dialog";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";

type StudentOption = { id: number; name: string; subject: string | null };

export function DashboardQuickActions({
  students,
}: {
  students: StudentOption[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <ScheduleClassDialog
        students={students}
        trigger={
          <Button size="sm">
            <CalendarPlus size={14} aria-hidden="true" /> Schedule a lesson
          </Button>
        }
      />
      <AddStudentDialog
        trigger={
          <Button variant="outline" size="sm">
            <Users size={14} aria-hidden="true" /> Add student
          </Button>
        }
      />
      <GenerateInvoiceDialog
        students={students}
        trigger={
          <Button variant="outline" size="sm">
            <Receipt size={14} aria-hidden="true" /> Generate invoice
          </Button>
        }
      />
    </div>
  );
}

export function DashboardScheduleEmpty({
  students,
}: {
  students: StudentOption[];
}) {
  return (
    <ScheduleClassDialog
      students={students}
      trigger={
        <Button variant="outline" size="sm" className="mt-3">
          <CalendarPlus size={14} aria-hidden="true" /> Schedule a lesson
        </Button>
      }
    />
  );
}
