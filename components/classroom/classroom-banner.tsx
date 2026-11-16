import { BookOpen, GraduationCap } from "lucide-react";

export function ClassroomBanner({ studentName, subject }: { studentName: string; subject: string | null }) {
  return (
    <div className="classroom-banner">
      <div className="classroom-banner-copy">
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-white/90"><GraduationCap size={22} /> TuitionHub Classroom</p>
        <h1>{subject || "Your learning space"}</h1>
        <p className="mt-3 text-xl font-medium">{studentName}</p>
      </div>
      <div className="classroom-banner-art" aria-hidden="true"><div className="classroom-art-disc" /><BookOpen size={110} strokeWidth={1.2} /><div className="classroom-art-dot" /></div>
    </div>
  );
}
