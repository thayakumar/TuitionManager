import Link from 'next/link';
import {DocumentTitle} from '@/components/document-title';
import { notFound, redirect } from 'next/navigation';
import { readDocument, documentActor, DocumentError } from '@/lib/documents';
import { Home, FileText, Sheet, ArrowUpRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Editor({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { let actor, doc; try {
    actor = await documentActor();
    doc = await readDocument((await params).id, actor, false);
}
catch (e) {
    if (e instanceof DocumentError && e.status === 401)
        redirect('/portal/student');
    notFound();
} if (doc.archived)
    return <main className="p-8"><h1 className="text-2xl font-bold">This document is archived</h1><Link href="/documents">Return to Documents to restore it</Link></main>; const home = actor.admin ? '/dashboard' : `/portal/student/${actor.studentId}`; const Icon = doc.kind === 'doc' ? FileText : Sheet; return <main className="fixed inset-0 flex flex-col bg-white"><header className="relative flex min-h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-5"><Link href={home} title="Back to workspace" aria-label="Back to workspace" className="rounded-xl p-2 hover:bg-muted"><Home size={23}/></Link><Icon size={24} className={doc.kind === 'doc' ? 'text-blue-600' : 'text-emerald-600'}/><DocumentTitle id={String(doc.id)} title={String(doc.title)} canRename={actor.admin}/><span className="rounded-full bg-muted px-3 py-1 text-sm">{doc.permission === 'edit' ? 'Can edit' : 'View only'}</span><Link href={actor.admin ? '/documents' : `/portal/student/${actor.studentId}/documents`} aria-label="Open Documents library" title="Documents library" className="rounded-xl p-2 hover:bg-muted"><ArrowUpRight size={20}/></Link></header><iframe title={String(doc.title) + ' editor'} className="min-h-0 w-full flex-1 border-0" src={`/office-editor/index.html?id=${doc.id}&kind=${doc.kind}`} allow="clipboard-read; clipboard-write; fullscreen"/></main>; }
