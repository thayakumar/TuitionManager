import { requireAdminPage } from "@/lib/auth";
import { FamilyChat } from "@/components/family-chat";
export const dynamic = "force-dynamic";
export default async function ChatsPage() {
  await requireAdminPage();
  return <FamilyChat role="admin"/>;
}
