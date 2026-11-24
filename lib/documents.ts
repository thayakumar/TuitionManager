import crypto from 'node:crypto';
import { verifyAdminSession, getStudentSession } from './auth';
import { queryOne, queryAll, withTransaction } from './db';
import type { Transaction } from '@libsql/client';
export class DocumentError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export type DocumentActor = {
    admin: boolean;
    studentId: number | null;
};
export type OfficeDocument = {
    id: string;
    title: string;
    kind: 'doc' | 'sheet';
    class_id: number | null;
    lesson_date: string | null;
    student_name: string | null;
    revision: number;
    updated_at: string;
    created_at: string;
    preview: string;
    archived: number;
    permission: 'edit' | 'view';
    shared_count: number;
};
export async function documentActor(): Promise<DocumentActor> { const admin = await verifyAdminSession(), studentId = admin ? null : await getStudentSession(); if (!admin && !studentId)
    throw new DocumentError(401, 'Sign in to open documents'); return { admin, studentId }; }
function validId(id: string) { if (!/^[a-f0-9-]{36}$/.test(id))
    throw new DocumentError(404, 'Document not found'); }
async function access(tx: Transaction, id: string, actor: DocumentActor, write = false, includeContent = true) { validId(id); const row = (await tx.execute({ sql: `SELECT d.id,d.title,d.kind,d.class_id,d.revision,d.updated_at,d.preview,d.archived${includeContent ? ',d.content' : ',length(d.content) content_length'},g.permission FROM office_documents d LEFT JOIN office_document_grants g ON g.document_id=d.id AND g.student_id=? LEFT JOIN students s ON s.id=g.student_id WHERE d.id=?`, args: [actor.studentId || 0, id] })).rows[0]; if (!row || (!actor.admin && (!row.permission || !(await tx.execute({ sql: 'SELECT id FROM students WHERE id=? AND active=1', args: [actor.studentId!] })).rows.length)) || (!actor.admin && row.archived))
    throw new DocumentError(404, 'Document not found'); if (write && !actor.admin && row.permission !== 'edit')
    throw new DocumentError(403, 'This document is view only'); return row; }
function admin(actor: DocumentActor) { if (!actor.admin)
    throw new DocumentError(403, 'Only your tutor can manage documents'); }
const notify = async (tx: Transaction, id: string, sid: number, title: string) => tx.execute({ sql: "INSERT INTO notifications(recipient_type,recipient_id,type,title,message,link)VALUES('student',?,'document_updated',?,'Your classroom document access or details changed.',?)", args: [sid, title, `/portal/student/${sid}/documents`] });
export async function listDocuments(input: {
    q?: string;
    kind?: string;
    class_id?: number;
    student_id?: number;
    page?: number;
    sort?: string;
    archived?: boolean;
    linked?: boolean;
} = {}, actor?: DocumentActor) { actor ??= await documentActor(); let where = actor.admin ? '1=1' : "d.archived=0 AND g.student_id=? AND EXISTS(SELECT 1 FROM students WHERE id=g.student_id AND active=1)"; const args: (string | number)[] = actor.admin ? [] : [actor.studentId!]; if (actor.admin) {
    where += ' AND d.archived=?';
    args.push(input.archived ? 1 : 0);
} if(input.linked!==undefined){where+=' AND d.class_id IS '+(input.linked?'NOT NULL':'NULL');} if (input.q) {
    where += " AND instr(lower(d.title||' '||d.preview),lower(?))>0";
    args.push(input.q.slice(0, 300));
} if (['doc', 'sheet'].includes(input.kind || '')) {
    where += ' AND d.kind=?';
    args.push(input.kind!);
} if (input.class_id) {
    where += ' AND d.class_id=?';
    args.push(input.class_id);
} if (input.student_id && actor.admin) {
    where += ' AND EXISTS(SELECT 1 FROM office_document_grants x WHERE x.document_id=d.id AND x.student_id=?)';
    args.push(input.student_id);
} const join = ` FROM office_documents d LEFT JOIN office_document_grants g ON g.document_id=d.id AND g.student_id=${actor.admin ? 0 : actor.studentId} LEFT JOIN classes c ON c.id=d.class_id LEFT JOIN students s ON s.id=c.student_id WHERE ${where}`; const page = Math.max(1, Math.floor(Number(input.page) || 1)); const sort = input.sort==='kind'?'d.kind,d.title':input.sort==='shared'?'shared_count DESC,d.title':input.sort==='lesson'?"COALESCE(c.scheduled_at,'') DESC,d.title":input.sort === 'name' ? 'd.title COLLATE NOCASE ASC,d.id' : input.sort === 'oldest' ? 'd.updated_at ASC,d.id' : 'd.updated_at DESC,d.id'; const [rows, count] = await Promise.all([queryAll<OfficeDocument>(`SELECT d.id,d.title,d.kind,d.class_id,d.revision,d.updated_at,d.created_at,d.preview,d.archived,c.scheduled_at lesson_date,s.name student_name,COALESCE(g.permission,'edit') permission,(SELECT COUNT(*) FROM office_document_grants WHERE document_id=d.id) shared_count${join} ORDER BY ${sort} LIMIT 20 OFFSET ?`, [...args, (page - 1) * 20]), queryOne<{
        total: number;
    }>('SELECT COUNT(*) total' + join, args)]); return { rows, total: Number(count?.total || 0), page, pageSize: 20 }; }
export async function readDocument(id: string, actor?: DocumentActor, includeContent = true) { actor ??= await documentActor(); return withTransaction(async (tx) => { const row = await access(tx, id, actor, false, includeContent); const grants = actor!.admin ? (await tx.execute({ sql: 'SELECT g.student_id,g.permission,s.name FROM office_document_grants g JOIN students s ON s.id=g.student_id WHERE g.document_id=? ORDER BY s.name', args: [id] })).rows : []; return { id: row.id, title: row.title, kind: row.kind, class_id: row.class_id, revision: Number(row.revision), updated_at: row.updated_at, preview: row.preview, content: row.content ? String(row.content) : null, content_length:Number(row.content_length??0), permission: actor!.admin ? 'edit' : row.permission, archived: row.archived, grants }; }); }
export async function createDocument(input: {
    kind: string;
    title?: string;
    class_id?: number;
    request_id: string;
}, actor?: DocumentActor) { actor ??= await documentActor(); admin(actor); if (!['doc', 'sheet'].includes(input.kind))
    throw new DocumentError(400, 'Choose a document or spreadsheet'); if (!/^[\w.-]{8,128}$/.test(input.request_id))
    throw new DocumentError(400, 'Invalid creation request'); if (input.title !== undefined && typeof input.title !== 'string')
    throw new DocumentError(400, 'Invalid title'); const title = (input.title || ('Untitled ' + (input.kind === 'doc' ? 'document' : 'spreadsheet'))).trim(); if (!title || title.length > 200)
    throw new DocumentError(400, 'Use a title of 1–200 characters'); return withTransaction(async (tx) => { const previous = (await tx.execute({ sql: 'SELECT id,kind,class_id FROM office_documents WHERE creation_key=?', args: [input.request_id] })).rows[0]; if (previous) {
    if (previous.kind !== input.kind || Number(previous.class_id || 0) !== Number(input.class_id || 0))
        throw new DocumentError(409, 'Creation request already used');
    return { id: String(previous.id) };
} let sid: number | null = null; if (input.class_id !== undefined) {
    if (!Number.isSafeInteger(input.class_id) || input.class_id < 1)
        throw new DocumentError(400, 'Invalid lesson');
    const lesson = (await tx.execute({ sql: 'SELECT c.student_id FROM classes c JOIN students s ON s.id=c.student_id WHERE c.id=? AND s.active=1', args: [input.class_id] })).rows[0];
    if (!lesson)
        throw new DocumentError(404, 'Lesson not found');
    sid = Number(lesson.student_id);
} const id = crypto.randomUUID(); await tx.execute({ sql: 'INSERT INTO office_documents(id,title,kind,class_id,creation_key)VALUES(?,?,?,?,?)', args: [id, title, input.kind, input.class_id || null, input.request_id] }); if (sid) {
    await tx.execute({ sql: "INSERT INTO office_document_grants(document_id,student_id,permission)VALUES(?,?,'edit')", args: [id, sid] });
    await notify(tx, id, sid, 'New lesson ' + (input.kind === 'doc' ? 'document' : 'spreadsheet') + ': ' + title);
} return { id }; }); }
export async function manageDocument(id: string, input: Record<string, unknown>, actor?: DocumentActor) { actor ??= await documentActor(); admin(actor); return withTransaction(async (tx) => { const row = await access(tx, id, actor!); const before = (await tx.execute({ sql: 'SELECT student_id,permission FROM office_document_grants WHERE document_id=?', args: [id] })).rows; const action = input.action; if (action === 'rename') {
    if (typeof input.title !== 'string')
        throw new DocumentError(400, 'Invalid title');
    const title = input.title.trim();
    if (!title || title.length > 200)
        throw new DocumentError(400, 'Use a title of 1–200 characters');
    if (title === row.title)
        return { success: true };
    await tx.execute({ sql: "UPDATE office_documents SET title=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?", args: [title, id] });
}
else if (action === 'archive' || action === 'restore') {
    if (Number(row.archived) === (action === 'archive' ? 1 : 0))
        return { success: true };
    await tx.execute({ sql: 'UPDATE office_documents SET archived=? WHERE id=?', args: [action === 'archive' ? 1 : 0, id] });
    await tx.execute({ sql: 'DELETE FROM office_edit_leases WHERE document_id=?', args: [id] });
}
else if (action === 'share') {
    if (!Array.isArray(input.grants) || input.grants.length > 500)
        throw new DocumentError(400, 'Invalid student access');
    const grants = input.grants as {
        student_id: number;
        permission: string;
    }[];
    const seen = new Set<number>();
    for (const g of grants) {
        if (!g || typeof g !== 'object' || !Number.isSafeInteger(g.student_id) || seen.has(g.student_id) || !['view', 'edit'].includes(g.permission))
            throw new DocumentError(400, 'Invalid student access');
        seen.add(g.student_id);
        if (!(await tx.execute({ sql: 'SELECT id FROM students WHERE id=? AND active=1', args: [g.student_id] })).rows.length)
            throw new DocumentError(400, 'Choose active students');
    }
    const same = before.length === grants.length && before.every(old => grants.some(g => g.student_id === Number(old.student_id) && g.permission === old.permission));
    if (same)
        return { success: true };
    await tx.execute({ sql: 'DELETE FROM office_document_grants WHERE document_id=?', args: [id] });
    for (const g of grants)
        await tx.execute({ sql: 'INSERT INTO office_document_grants(document_id,student_id,permission)VALUES(?,?,?)', args: [id, g.student_id, g.permission] });
    await tx.execute({ sql: 'DELETE FROM office_edit_leases WHERE document_id=?', args: [id] });
}
else if (action === 'duplicate') {
    const copy = crypto.randomUUID();
    await tx.execute({ sql: 'INSERT INTO office_documents(id,title,kind,content,preview,creation_key)VALUES(?,?,?,?,?,?)', args: [copy, (String(row.title) + ' (copy)').slice(0, 200), row.kind, row.content, row.preview, crypto.randomUUID()] });
    return { id: copy };
}
else
    throw new DocumentError(400, 'Unknown document action'); const after = (await tx.execute({ sql: 'SELECT student_id FROM office_document_grants WHERE document_id=?', args: [id] })).rows; const recipients = [...new Map([...before, ...after].map(s => [Number(s.student_id), s])).values()]; for (const s of recipients)
    await notify(tx, id, Number(s.student_id), 'Document updated: ' + String(input.title || row.title)); return { success: true }; }); }
async function saveInTransaction(tx: Transaction, id: string, input: {
    content: string;
    revision: number;
    preview?: string;
    client_id: string;
}, actor: DocumentActor) { if (typeof input.content !== 'string' || !Number.isSafeInteger(input.revision) || input.revision < 0)
    throw new DocumentError(400, 'Invalid document snapshot'); const row = await access(tx, id, actor!, true, false); const lease = (await tx.execute({ sql: 'SELECT owner_key FROM office_edit_leases WHERE document_id=? AND expires_at>?', args: [id, Date.now()] })).rows[0]; if (!lease || lease.owner_key !== leaseKey(actor!, input.client_id))
    throw new DocumentError(409, 'Your editing session expired. Download your changes before reopening the file.'); if (row.archived)
    throw new DocumentError(409, 'Restore this document before editing'); if (Number(row.revision) !== input.revision)
    throw new DocumentError(409, 'A newer version was saved. Your changes are retained; download a copy before reloading.'); if (row.kind === 'sheet') {
    try {
        const data = JSON.parse(input.content);
        if (!data || typeof data !== 'object' || Array.isArray(data) || !(data.format === 'xlsx' ? typeof data.data === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(data.data) && Buffer.from(data.data, 'base64').subarray(0, 2).equals(Buffer.from('PK')) : data.sheets))
            throw Error();
    }
    catch {
        throw new DocumentError(400, 'Invalid spreadsheet snapshot');
    }
}
else if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.content) || !Buffer.from(input.content, 'base64').subarray(0, 2).equals(Buffer.from('PK')))
    throw new DocumentError(400, 'Invalid document data'); await tx.execute({ sql: "UPDATE office_documents SET content=?,preview=?,revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?", args: [input.content, String(input.preview || '').slice(0, 600), id] }); return { revision: input.revision + 1 }; }
export async function saveDocument(id: string, input: {
    content: string;
    revision: number;
    preview?: string;
    client_id: string;
}, actor?: DocumentActor) { actor ??= await documentActor(); return withTransaction(tx => saveInTransaction(tx, id, input, actor!)); }
export async function saveDocumentPart(id: string, input: {
    client_id: string;
    save_id: string;
    part: number;
    content: string;
}, actor?: DocumentActor) { actor ??= await documentActor(); if (!/^[a-f0-9-]{36}$/.test(input.save_id || '') || !Number.isSafeInteger(input.part) || input.part < 0 || input.part > 1000000 || typeof input.content !== 'string' || Buffer.byteLength(input.content) > 1000000)
    throw new DocumentError(400, 'Invalid save chunk'); return withTransaction(async (tx) => { await access(tx, id, actor!, true, false); const key = leaseKey(actor!, input.client_id), lease = (await tx.execute({ sql: 'SELECT document_id FROM office_edit_leases WHERE document_id=? AND owner_key=? AND expires_at>?', args: [id, key, Date.now()] })).rows[0]; if (!lease)
    throw new DocumentError(409, 'Editing session expired'); await tx.execute({ sql: 'DELETE FROM office_save_parts WHERE expires_at<?', args: [Date.now()] }); await tx.execute({ sql: 'INSERT INTO office_save_parts(document_id,save_id,owner_key,part,content,expires_at)VALUES(?,?,?,?,?,?) ON CONFLICT(document_id,save_id,part) DO UPDATE SET content=excluded.content WHERE owner_key=excluded.owner_key', args: [id, input.save_id, key, input.part, input.content, Date.now() + 1800000] }); return { success: true }; }); }
export async function finishDocumentSave(id: string, input: {
    client_id: string;
    save_id: string;
    parts: number;
    revision: number;
    preview?: string;
}, actor?: DocumentActor) { actor ??= await documentActor(); if (!Number.isSafeInteger(input.parts) || input.parts < 1)
    throw new DocumentError(400, 'Invalid save chunks'); return withTransaction(async (tx) => { const rows = (await tx.execute({ sql: 'SELECT part,content FROM office_save_parts WHERE document_id=? AND save_id=? AND owner_key=? AND expires_at>? ORDER BY part', args: [id, input.save_id, leaseKey(actor!, input.client_id), Date.now()] })).rows; if (rows.length !== input.parts || rows.some((r, i) => Number(r.part) !== i))
    throw new DocumentError(409, 'Save is incomplete; retry the missing chunks'); const result = await saveInTransaction(tx, id, { ...input, content: rows.map(r => String(r.content)).join('') }, actor!); await tx.execute({ sql: 'DELETE FROM office_save_parts WHERE document_id=? AND save_id=?', args: [id, input.save_id] }); return result; }); }
function leaseKey(actor: DocumentActor, clientId: string) { if (!/^[a-f0-9-]{36}$/.test(clientId || ''))
    throw new DocumentError(400, 'Invalid editing session'); return crypto.createHash('sha256').update((actor.admin ? 'admin' : 'student:' + actor.studentId) + ':' + clientId).digest('hex'); }
export async function documentLease(id: string, clientId: string, release = false, actor?: DocumentActor) { actor ??= await documentActor(); const key = leaseKey(actor, clientId); return withTransaction(async (tx) => { const row = await access(tx, id, actor!, true, false); if (row.archived)
    throw new DocumentError(409, 'Restore this document before editing'); if (release) {
    await tx.execute({ sql: 'DELETE FROM office_edit_leases WHERE document_id=? AND owner_key=?', args: [id, key] });
    return { editing: false, owner: null, expires_at: 0 };
} const name = actor!.admin ? 'Tutor' : String((await tx.execute({ sql: 'SELECT name FROM students WHERE id=?', args: [actor!.studentId!] })).rows[0]?.name || 'Student'); await tx.execute({ sql: 'INSERT INTO office_edit_leases(document_id,owner_key,owner_name,expires_at)VALUES(?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET owner_key=excluded.owner_key,owner_name=excluded.owner_name,expires_at=excluded.expires_at WHERE expires_at<? OR owner_key=excluded.owner_key', args: [id, key, name, Date.now() + 90000, Date.now()] }); const lease = (await tx.execute({ sql: 'SELECT owner_key,owner_name,expires_at FROM office_edit_leases WHERE document_id=?', args: [id] })).rows[0]; return { editing: lease.owner_key === key, owner: lease.owner_name, expires_at: Number(lease.expires_at) }; }); }

/** Bounded, revision-bound reads avoid Vercel response-size limits and mixed versions. */
export async function readDocumentSlice(id:string,offset:number,revision:number,actor?:DocumentActor){
  actor??=await documentActor();if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(revision)||revision<0)throw new DocumentError(400,'Invalid document range');
  return withTransaction(async tx=>{const row=await access(tx,id,actor!,false,false);if(Number(row.revision)!==revision)throw new DocumentError(409,'The file changed while opening. Reopen it to load the latest saved version.');const chunk=(await tx.execute({sql:'SELECT substr(content,?,200000) content FROM office_documents WHERE id=?',args:[offset+1,id]})).rows[0];const text=String(chunk.content||'');return{content:text,next_offset:offset+Array.from(text).length,total_characters:Number(row.content_length||0),revision}});
}
