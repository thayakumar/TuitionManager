import React, { useEffect, useRef, useState } from 'react';
import { DocxEditor } from '@casualoffice/docs/react';
import '@casualoffice/docs/styles.css';
import JSZip from 'jszip';
async function blank() { const zip = new JSZip(); zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'); zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'); zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>'); return zip.generateAsync({ type: 'arraybuffer' }); }
export function Editor({ doc, editing, handle, onSave, onDirty, onError, decode, encode, preview }: any) { const ref = useRef<any>(null), [bytes, setBytes] = useState<ArrayBuffer | null>(null), dirty = useRef(false), running = useRef(false); const save = async () => { if (!editing || !ref.current || running.current)
    return; running.current = true; try {
    const b = await ref.current.save();
    if (b) {
        await onSave(encode(b), preview(ref.current.getDocument()));
        dirty.current = false;
    }
}
catch (e) {
    onError(e);
}
finally {
    running.current = false;
} }; useEffect(() => { (async () => setBytes(doc.content ? decode(doc.content) : await blank()))().catch(onError); handle.current = { save, download: async () => { const b = await ref.current?.save(); return b ? new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) : null; } }; const timer = setInterval(() => { if (dirty.current)
    void save(); }, 2000); return () => clearInterval(timer); }, []); useEffect(() => { handle.current = { save, download: async () => { const b = await ref.current?.save(); return b ? new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) : null; } }; }, [editing]); if (!bytes)
    return <div className="office-loading">Loading document…</div>; return <DocxEditor ref={ref} documentBuffer={bytes} readOnly={!editing} showToolbar={true} documentName={doc.title} documentNameEditable={false} ai={{ enabled: false }} onDirtyChange={(value: boolean) => { if (value && editing) {
    dirty.current = true;
    onDirty();
} }} onSave={(b: ArrayBuffer) => { if (editing)
    void onSave(encode(b), preview(ref.current?.getDocument())).catch(onError); }} onError={onError}/>; }
