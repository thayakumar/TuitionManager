import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { documentActor, DocumentError } from '@/lib/documents';
import { queryOne } from '@/lib/db';
import { DocumentLibrary } from '@/components/document-library';
import { Home } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function LessonDocuments({ params }: {
    params: Promise<{
        classId: string;
    }>;
}) { let actor; try {
    actor = await documentActor();
}
catch {
    redirect('/portal/student');
} const id = Number((await params).classId); if (!Number.isSafeInteger(id) || id < 1)
    notFound(); const lesson = await queryOne<{
    name: string;
    scheduled_at: string;
}>('SELECT s.name,c.scheduled_at FROM classes c JOIN students s ON s.id=c.student_id WHERE c.id=? AND (?=1 OR (c.student_id=? AND s.active=1))', [id, actor.admin ? 1 : 0, actor.studentId || 0]); if (!lesson)
    notFound(); return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><header className="flex items-center gap-4"><Link href={actor.admin ? '/dashboard' : `/portal/student/${actor.studentId}`} aria-label="Back to workspace" className="rounded-xl border p-3"><Home /></Link><div><h1 className="text-2xl font-bold">Lesson documents</h1><p className="text-muted-foreground">{lesson.name} · {fmtDateTime(lesson.scheduled_at)}</p></div></header><DocumentLibrary admin={actor.admin} classId={id}/></main>; }
