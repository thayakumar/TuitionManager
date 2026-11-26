import { WorkspaceHeader } from "@/components/workspace-header";
import { ownStudentContext } from "@/lib/portal-context";
import { PortalNav } from "@/components/portal-nav";
export const dynamic = "force-dynamic";
export default async function StudentPortalLayout({
  params: paramsPromise,
  children,
}: {
  params: Promise<{ studentId: string }>;
  children: React.ReactNode;
}) {
  const params = await paramsPromise;
  const student = await ownStudentContext(Number(params.studentId));
  return (
    <>
      <PortalNav
        role="student"
        studentId={student.id}
        studentName={student.name}
      />
      <main className="min-h-dvh bg-background md:ml-60">
        <WorkspaceHeader role="Student" name={student.name} avatarSrc={student.profile_photo_url} />
        <div className="workspace-page mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
