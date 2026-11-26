import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { FamilyChat } from "@/components/family-chat";

export const dynamic = "force-dynamic";

export default async function StudentChatThreadPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdminPage();
  const { studentId } = await params;
  const id = Number(studentId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return (
    <>
      <PageHeader
        title="Family chats"
        subtitle="Messages with students and parents in one place."
      />
      <FamilyChat role="admin" studentId={id} />
    </>
  );
}
