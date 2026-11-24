import { DocumentError } from './documents';
export const documentHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export function documentFailure(e: unknown) { if (!(e instanceof DocumentError))
    console.error('Document request failed', e instanceof Error ? e.name : 'Unknown'); return Response.json({ error: e instanceof DocumentError ? e.message : 'Could not complete the document request' }, { status: e instanceof DocumentError ? e.status : 500, headers: documentHeaders }); }
export function documentOrigin(request: Request) { const u = new URL(request.url), host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || u.host, proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || u.protocol.slice(0, -1); if (!['http', 'https'].includes(proto) || request.headers.get('origin') !== `${proto}://${host}` || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new DocumentError(403, 'Document changes must come from this site'); }
export async function documentBody(request: Request) { const reader = request.body?.getReader(); let size = 0; const parts: Uint8Array[] = []; if (reader)
    for (;;) {
        const r = await reader.read();
        if (r.done)
            break;
        size += r.value.byteLength;
        if (size > 3400000) {
            await reader.cancel();
            throw new DocumentError(413, 'Document request is too large');
        }
        parts.push(r.value);
    } let body; try {
    body = JSON.parse(Buffer.concat(parts).toString());
}
catch {
    throw new DocumentError(400, 'Expected JSON');
} if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new DocumentError(400, 'Expected an object'); return body; }
