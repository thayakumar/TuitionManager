"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Sheet, Grid2X2, List, Search, MoreVertical, Users, CalendarDays, ExternalLink, ChevronLeft, ChevronRight, Archive, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useActionBusy } from '@/components/action-busy';
import { fmtDateTime } from '@/lib/format';
import type { OfficeDocument } from '@/lib/documents';
type Student = {
    id: number;
    name: string;
};
export function DocumentLibrary({ admin, students = [], classId, compact = false }: {
    admin: boolean;
    students?: Student[];
    classId?: number;
    compact?: boolean;
}) {
    const [view, setView] = useState('grid'), [rows, setRows] = useState<OfficeDocument[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [q, setQ] = useState(''), [kind, setKind] = useState(''), [sid, setSid] = useState(''), [linked,setLinked]=useState(''),[sort, setSort] = useState('recent'), [archived, setArchived] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [dialog, setDialog] = useState<{
        doc: OfficeDocument;
        action: string;
    } | null>(null), [title, setTitle] = useState(''), [grants, setGrants] = useState<Record<number, string>>({}), [studentSearch, setStudentSearch] = useState('');
    useActionBusy(busy, 'Updating document…');
    useEffect(() => { const value = localStorage.getItem('tuitionhub-documents-view'); if (value === 'table')
        setView(value); }, []);
    const load = useCallback(async (signal?: AbortSignal) => { setLoading(true); try {
        const params = new URLSearchParams({ q, kind, page: String(page), sort, archived: String(archived), ...(classId ? { class_id: String(classId) } : {}), ...(sid ? { student_id: sid } : {}),...(linked?{linked}:{}) });
        const r = await fetch('/api/documents?' + params, { signal });
        const result = await r.json();
        if (!r.ok)
            throw Error(result.error);
        setRows(result.rows);
        setTotal(result.total);
        setError('');
    }
    catch (e) {
        if ((e as Error).name !== 'AbortError')
            setError((e as Error).message);
    }
    finally {
        if (!signal?.aborted)
            setLoading(false);
    } }, [q, kind, page, sort, archived, classId, sid,linked]);
    useEffect(() => { const controller = new AbortController(), timer = setTimeout(() => void load(controller.signal), 200); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
    useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void load();};const changed=(event:StorageEvent)=>{if(event.key==='tuitionhub-documents-updated')void load();};window.addEventListener('storage',changed);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('storage',changed);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load]);
    const post = async (id: string | null, body: unknown) => { const response = await fetch('/api/documents' + (id ? '/' + id : ''), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), data = await response.json(); if (!response.ok)
        throw Error(data.error); return data; };
    async function openDialog(doc: OfficeDocument, action: string) { setError(''); setTitle(doc.title); setStudentSearch(''); if (action === 'share') {
        setBusy(true);
        try {
            const r = await fetch('/api/documents/' + doc.id + '?metadata=1'), data = await r.json();
            if (!r.ok)
                throw Error(data.error);
            setGrants(Object.fromEntries(data.grants.map((g: any) => [g.student_id, g.permission])));
        }
        catch (e) {
            setError((e as Error).message);
            return;
        }
        finally {
            setBusy(false);
        }
    } setDialog({ doc, action }); }
    async function submit() { if (!dialog || busy)
        return; setBusy(true); setError(''); try {
        const result = await post(dialog.doc.id, { action: dialog.action, title, grants: Object.entries(grants).map(([id, permission]) => ({ student_id: Number(id), permission })) });
        setDialog(null);
        await load();
        if (result.id)
            window.open('/documents/' + result.id, '_blank', 'noopener,noreferrer');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function changeView(value: string) { setView(value); localStorage.setItem('tuitionhub-documents-view', value); }
    function actions(doc: OfficeDocument) { return admin ? <details className="relative shrink-0"><summary role="button" aria-label={'Actions for ' + doc.title} className="flex cursor-pointer list-none rounded-full p-2 hover:bg-muted"><MoreVertical size={21}/></summary><div className="absolute right-0 top-full z-20 min-w-44 rounded-xl border bg-white p-2 shadow-xl">{(doc.archived ? ['restore'] : ['rename', 'share', 'duplicate', 'archive']).map(action => <button key={action} className="block w-full rounded-lg px-3 py-2 text-left text-base capitalize hover:bg-muted" onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); void openDialog(doc, action); }}>{action === 'share' ? 'Manage access' : action}</button>)}</div></details> : null; }
    function fileIcon(doc: OfficeDocument) { const Icon = doc.kind === 'doc' ? FileText : Sheet; return <Icon size={23} className={doc.kind === 'doc' ? 'shrink-0 text-blue-600' : 'shrink-0 text-emerald-600'}/>; }
    return <section className="min-w-0 space-y-5" aria-label={classId ? 'Lesson documents' : 'Documents library'}><div className="flex flex-wrap items-center justify-between gap-4">{compact && <h2 className="text-xl font-bold">Lesson documents</h2>}{admin && <div className="flex flex-wrap gap-3"><Button variant="outline" asChild><Link href={'/documents/new?kind=doc'+(classId?'&class_id='+classId:'')} target="_blank" rel="noopener" prefetch={false}><FileText size={19} className="text-blue-600"/>New document</Link></Button><Button variant="outline" asChild><Link href={'/documents/new?kind=sheet'+(classId?'&class_id='+classId:'')} target="_blank" rel="noopener" prefetch={false}><Sheet size={19} className="text-emerald-600"/>New sheet</Link></Button></div>}<div className="ml-auto flex rounded-xl border bg-card p-1" role="group" aria-label="Document layout"><button title="Grid view" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')} className={'rounded-lg p-2 ' + (view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}><Grid2X2 size={22}/></button><button title="Table view" aria-label="Table view" aria-pressed={view === 'table'} onClick={() => changeView('table')} className={'rounded-lg p-2 ' + (view === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}><List size={22}/></button></div></div><div className="flex flex-wrap gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-3"><Search size={19} className="shrink-0 text-muted-foreground"/><input aria-label="Search documents" placeholder="Search names and previews…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className="min-w-0 w-full bg-transparent py-3 outline-none"/></label><select aria-label="File type" className="rounded-xl border bg-card px-3 py-3" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">All file types</option><option value="doc">Documents</option><option value="sheet">Spreadsheets</option></select>{admin && !compact && <select aria-label="Shared student" className="max-w-full rounded-xl border bg-card px-3 py-3" value={sid} onChange={e => { setSid(e.target.value); setPage(1); }}><option value="">All students</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}{!compact&&!classId&&<select aria-label="Lesson link" value={linked} onChange={e=>{setLinked(e.target.value);setPage(1)}} className="rounded-xl border bg-card px-3 py-3"><option value="">All lesson links</option><option value="true">Linked to a lesson</option><option value="false">Standalone files</option></select>}<select aria-label="Sort documents" className="rounded-xl border bg-card px-3 py-3" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="recent">Recently edited</option><option value="name">Name A–Z</option><option value="oldest">Oldest edited</option><option value="kind">File type</option><option value="shared">Most shared</option><option value="lesson">Lesson date</option></select>{admin && !compact && <button aria-pressed={archived} className={'flex items-center gap-2 rounded-xl border px-3 ' + (archived ? 'bg-muted' : 'bg-card')} onClick={() => { setArchived(!archived); setPage(1); }}><Archive size={18}/>Archived</button>}</div>{error && !dialog && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{loading ? <div role="status" className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">Loading documents…</div> : !rows.length ? <div className="rounded-2xl border border-dashed bg-card p-12 text-center"><FolderOpen className="mx-auto mb-4 text-muted-foreground" size={40}/><h3 className="text-xl font-semibold">{q || kind || sid ? 'No matching files' : archived ? 'No archived files' : 'Your workspace starts here'}</h3><p className="mt-2 text-muted-foreground">{admin ? 'Create a document or spreadsheet to get started.' : 'Your tutor’s shared documents will appear here.'}</p></div> : view === 'grid' ? <div className={'grid gap-5 ' + (compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>{rows.map(doc => <article key={doc.id} className="group min-w-0 rounded-2xl border bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"><Link href={'/documents/' + doc.id} target="_blank" rel="noopener noreferrer" aria-label={'Open ' + doc.title} className="block overflow-hidden rounded-t-2xl border-b bg-slate-50 p-5"><div className="aspect-[1.15] overflow-hidden rounded-sm border bg-white p-5 shadow-sm" aria-hidden="true">{doc.kind === 'sheet' ? <div className="h-full bg-[linear-gradient(#e3e9e5_1px,transparent_1px),linear-gradient(90deg,#e3e9e5_1px,transparent_1px)] bg-[size:100%_22px,45px_100%] p-1 text-xs leading-[22px] text-slate-600">{doc.preview || 'A     B     C     D'}</div> : <div className="text-[11px] leading-relaxed text-slate-600"><div className="mb-4 font-semibold text-slate-800">{doc.title}</div>{doc.preview ? <p className="whitespace-pre-wrap">{doc.preview}</p> : Array.from({ length: 7 }, (_, i) => <div key={i} className={'mb-3 h-1 rounded bg-slate-100 ' + (i % 3 === 2 ? 'w-2/3' : 'w-full')}/>)}</div>}</div></Link><div className="space-y-3 p-4"><div className="flex items-start gap-2"><Link href={'/documents/' + doc.id} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-lg font-semibold" title={doc.title}>{doc.title}</Link>{actions(doc)}</div><div className="flex items-center gap-2 text-sm text-muted-foreground">{fileIcon(doc)}{doc.shared_count > 0 && <Users size={17}/>}<span className="truncate" title={fmtDateTime(doc.updated_at)}>Edited {new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' })}</span></div><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays size={15} className="shrink-0"/><span className="line-clamp-2" title={doc.lesson_date ? fmtDateTime(doc.lesson_date) : undefined}>{doc.lesson_date ? `${doc.student_name} · ${new Date(doc.lesson_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' })}` : 'No linked lesson'}</span></div>{!admin && <span className="inline-block rounded-full bg-blue-50 px-2 py-1 text-sm text-blue-700">{doc.permission === 'edit' ? 'Can edit' : 'View only'}</span>}</div></article>)}</div> : <div className="rounded-2xl border bg-card"><table className="w-full text-left"><thead className="border-b bg-muted/40 text-sm text-muted-foreground"><tr><th className="p-4"><button onClick={() => setSort('name')}>File name</button></th><th className="hidden p-4 sm:table-cell"><button onClick={()=>setSort('kind')}>Type</button></th><th className="hidden p-4 md:table-cell"><button onClick={()=>setSort('shared')}>Shared</button></th><th className="hidden p-4 lg:table-cell"><button onClick={()=>setSort('lesson')}>Linked lesson</button></th><th className="hidden p-4 sm:table-cell"><button onClick={() => setSort(sort === 'recent' ? 'oldest' : 'recent')}>Last edited</button></th><th className="p-4"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(doc => <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30"><td className="max-w-[150px] p-4 sm:max-w-[260px]"><Link href={'/documents/' + doc.id} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-semibold">{fileIcon(doc)}<span className="truncate">{doc.title}</span></Link><p className="mt-1 text-xs text-muted-foreground sm:hidden">{fmtDateTime(doc.updated_at)}</p></td><td className="hidden p-4 sm:table-cell">{doc.kind === 'doc' ? 'Document' : 'Spreadsheet'}</td><td className="hidden p-4 md:table-cell">{doc.shared_count ? doc.shared_count + ' student' + (doc.shared_count === 1 ? '' : 's') : 'Private'}</td><td className="hidden p-4 lg:table-cell">{doc.lesson_date ? fmtDateTime(doc.lesson_date) : 'No linked lesson'}</td><td className="hidden p-4 text-sm sm:table-cell">{fmtDateTime(doc.updated_at)}</td><td className="p-3">{actions(doc)}</td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{total} file{total === 1 ? '' : 's'}</span><div className="flex items-center gap-3"><Button size="sm" variant="outline" aria-label="Previous documents page" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={18}/></Button><span>Page {page} of {Math.max(1, Math.ceil(total / 20))}</span><Button size="sm" variant="outline" aria-label="Next documents page" disabled={page * 20 >= total || loading} onClick={() => setPage(page + 1)}><ChevronRight size={18}/></Button></div></div><Dialog open={!!dialog} onOpenChange={open => { if (!busy && !open)
        setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>{dialog?.action === 'share' ? 'Manage access' : dialog?.action === 'rename' ? 'Rename file' : dialog?.action === 'duplicate' ? 'Duplicate file' : dialog?.action === 'restore' ? 'Restore file' : 'Archive file'}</DialogTitle><DialogDescription>{dialog?.doc.title}</DialogDescription></DialogHeader>{dialog?.action === 'rename' && <label className="space-y-2">File name<input autoFocus aria-label="File name" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border p-3"/></label>}{dialog?.action === 'share' ? <div className="space-y-4"><p className="text-muted-foreground">Only selected students can open this file. One person edits at a time.</p><input aria-label="Find a student to share with" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Find a student…" className="w-full rounded-xl border p-3"/><div className="max-h-72 space-y-2 overflow-auto">{students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => <label key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="min-w-0 break-words">{s.name}</span><select aria-label={'Access for ' + s.name} value={grants[s.id] || ''} onChange={e => setGrants(old => { const copy = { ...old }; if (e.target.value)
        copy[s.id] = e.target.value;
    else
        delete copy[s.id]; return copy; })} className="rounded-lg border p-2"><option value="">No access</option><option value="view">Can view</option><option value="edit">Can edit</option></select></label>)}</div></div> : dialog?.action === 'archive' ? <p>Students will lose access. You can restore this file from Archived.</p> : dialog?.action === 'duplicate' ? <p>Create a private, standalone copy. Student access and lesson links will not be copied.</p> : null}{error && dialog && <p role="alert" className="text-red-700">{error}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button disabled={busy || dialog?.action === 'rename' && !title.trim()} onClick={() => void submit()}>{busy ? 'Saving…' : dialog?.action === 'share' ? 'Save access' : dialog?.action === 'rename' ? 'Save name' : 'Confirm'}</Button></div></DialogContent></Dialog></section>;
}
