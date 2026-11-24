import { listDocuments, createDocument } from '@/lib/documents';
import { documentFailure, documentOrigin, documentBody, documentHeaders } from '@/lib/document-http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { try {
    const p = new URL(request.url).searchParams;
    return Response.json(await listDocuments({ q: p.get('q') || '', kind: p.get('kind') || '', class_id: Number(p.get('class_id')) || undefined, student_id: Number(p.get('student_id')) || undefined, page: Number(p.get('page')) || 1, sort: p.get('sort') || '', archived: p.get('archived') === 'true',linked:p.has('linked')?p.get('linked')==='true':undefined }), { headers: documentHeaders });
}
catch (e) {
    return documentFailure(e);
} }
export async function POST(request: Request) { try {
    documentOrigin(request);
    return Response.json(await createDocument(await documentBody(request)), { headers: documentHeaders });
}
catch (e) {
    return documentFailure(e);
} }
