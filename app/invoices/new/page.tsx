import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { queryAll } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { GenerateInvoiceDialog } from "@/components/generate-invoice-dialog";
export const dynamic = "force-dynamic";
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  await requireAdminPage();
  const p = await searchParams,
    students = await queryAll<{ id: number; name: string }>(
      "SELECT id,name FROM students WHERE active=1 ORDER BY name",
    );
  return (
    <>
      <PageHeader
        title="Generate invoice"
        subtitle="Create a month-end document from completed, attended lessons."
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Choose the student and period</CardTitle>
          <CardDescription>
            Cancelled lessons and absences never appear. A replacement lesson
            becomes billable when marked Present; free trials remain free.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <GenerateInvoiceDialog
            students={students}
            defaultStudentId={Number(p.student) || undefined}
          />
          <Link href="/invoices" className="text-sm text-primary underline">
            Back to invoices
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
