import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { FamilyChat } from "@/components/family-chat";
export const dynamic = "force-dynamic";
export default async function ChatsPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader
        title="Family chats"
        subtitle="Messages with students and parents in one place."
      />
      <FamilyChat role="admin" />
    </>
  );
}
