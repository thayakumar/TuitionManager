import { redirect } from "next/navigation";

export default function OldPortalRedirect({ params }: { params: { studentId: string } }) {
  redirect(`/portal/student/${params.studentId}`);
}
