import { WorkspaceHeader } from "@/components/workspace-header";
import { requireParent } from "@/lib/portal-context";
import { getSettings } from "@/lib/db";
import { ParentNav } from "@/components/parent-nav";
export const dynamic = "force-dynamic";
export default async function ParentShareLayout({
  params: paramsPromise,
  children,
}: {
  params: Promise<{ token: string }>;
  children: React.ReactNode;
}) {
  const params = await paramsPromise;
  const [student, settings] = await Promise.all([
    requireParent(params.token),
    getSettings(["business_name"]),
  ]);
  return (
    <>
      <ParentNav
        token={params.token}
        studentName={student.name}
        businessName={settings.business_name || "TuitionHub"}
      />
      <main className="min-h-screen bg-background md:ml-60">
        <WorkspaceHeader role="Parent" name={student.name} avatarSrc={student.profile_photo_url ? student.profile_photo_url + "&parent_token=" + encodeURIComponent(params.token) : null} />
        <div className="workspace-page mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
