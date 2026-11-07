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
    <div className="mt-4 flex flex-wrap gap-3">
      <ScheduleClassDialog
        students={students}
        trigger={
          <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm" variant="outline" size="sm">
            <CalendarPlus size={14} /> Schedule Class
          </Button>
        }
      />
      <AddStudentDialog
        trigger={
          <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm" variant="outline" size="sm">
            <Users size={14} /> Add Student
          </Button>
        }
      />
      <GenerateInvoiceDialog
        students={students}
        trigger={
          <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm" variant="outline" size="sm">
            <Receipt size={14} /> Generate Invoice
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
          <CalendarPlus size={14} /> Schedule a class
        </Button>
      }
    />
  );
}
