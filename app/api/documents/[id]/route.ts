import { readDocument,readDocumentSlice, manageDocument, saveDocument, saveDocumentPart, finishDocumentSave, documentLease, DocumentError } from '@/lib/documents';
import { documentFailure, documentOrigin, documentBody, documentHeaders } from '@/lib/document-http';
export const dynamic = 'force-dynamic';
type C = {
    params: Promise<{
        id: string;
    }>;
};
export async function GET(request: Request, c: C) { try {
    const query=new URL(request.url).searchParams;if(query.has('offset'))return Response.json(await readDocumentSlice((await c.params).id,Number(query.get('offset')),Number(query.get('revision'))),{headers:documentHeaders});return Response.json(await readDocument((await c.params).id, undefined, new URL(request.url).searchParams.get('metadata') !== '1'), { headers: documentHeaders });
}
catch (e) {
    return documentFailure(e);
} }
export async function POST(request: Request, c: C) { try {
    documentOrigin(request);
    const id = (await c.params).id, body = await documentBody(request);
    if (body.action === 'lease' || body.action === 'release')
        return Response.json(await documentLease(id, body.client_id, body.action === 'release'), { headers: documentHeaders });
    if (body.action === 'save_part')
        return Response.json(await saveDocumentPart(id, body), { headers: documentHeaders });
    if (body.action === 'save_finish')
        return Response.json(await finishDocumentSave(id, body), { headers: documentHeaders });
    if (body.action === 'save')
        return Response.json(await saveDocument(id, body), { headers: documentHeaders });
    if (!['rename', 'archive', 'restore', 'share', 'duplicate'].includes(body.action))
        throw new DocumentError(400, 'Unknown document action');
    return Response.json(await manageDocument(id, body), { headers: documentHeaders });
}
catch (e) {
    return documentFailure(e);
} }
