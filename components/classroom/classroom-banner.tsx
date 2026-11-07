export function ClassroomBanner({
  studentName,
  subject,
}: {
  studentName: string;
  subject: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg">
      <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
      <div className="absolute right-20 bottom-0 size-20 rounded-full bg-white/5" />
      <div className="absolute left-1/2 -bottom-6 size-28 rounded-full bg-white/5" />
      <div className="relative">
        <h1 className="text-2xl font-bold">{studentName}&apos;s Classroom</h1>
        {subject && (
          <p className="text-sm text-white/80 mt-1">{subject}</p>
        )}
      </div>
    </div>
  );
}
