import { redirect } from "next/navigation";

export default async function OldPortalRedirect({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  redirect(`/portal/student/${studentId}`);
}
