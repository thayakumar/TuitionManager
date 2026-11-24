import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const id = new URLSearchParams(location.search).get('id') || '', clientId = crypto.randomUUID();
async function api(body?: unknown,suffix='') { const r = await fetch('/api/documents/' + id+suffix, { ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }); const data = await r.json(); if (!r.ok)
    throw new Error(data.error || 'Document request failed'); return data; }
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0)).buffer;
function encode(value: ArrayBuffer) { const b = new Uint8Array(value); let s = ''; for (let i = 0; i < b.length; i += 32768)
    s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); }
function textPreview(data: any): string { if (!data)
    return ''; if (data.sheets)
    return Object.values(data.sheets).flatMap((s: any) => Object.values(s.cellData || {}).flatMap((r: any) => Object.values(r).map((c: any) => String(c.v ?? '')))).filter(Boolean).slice(0, 40).join(' · ').slice(0, 600); const walk = (n: any): string => Array.isArray(n) ? n.map(walk).join(' ') : n && typeof n === 'object' ? (typeof n.text === 'string' ? n.text : Object.entries(n).filter(([k]) => !['styles', 'marks', 'attributes'].includes(k)).map(([, v]) => walk(v)).join(' ')) : ''; return walk(data).replace(/\s+/g, ' ').trim().slice(0, 600); }
function App() {
    const [doc, setDoc] = useState<any>(null), [error, setError] = useState(''), [status, setStatus] = useState('Opening…'), [editing, setEditing] = useState(false), [Engine, setEngine] = useState<any>(null);
    const changes = useRef(0);
    const revision = useRef(0), dirty = useRef(false), pending = useRef<any>(null), saving = useRef(false), blocked = useRef(false), handle = useRef<any>(null), lastContent = useRef(''), permission = useRef(false), active = useRef(false);
    const persist = async (content: string, preview: string) => { pending.current = { content, preview, generation: changes.current }; dirty.current = true; if (blocked.current)
        throw new Error('Save is paused. Retry saving or download a copy.'); if (saving.current)
        return; saving.current = true; try {
        while (pending.current) {
            const value = pending.current;
            pending.current = null;
            if (value.content === lastContent.current) {
                dirty.current = changes.current !== value.generation;
                setStatus(dirty.current ? 'Unsaved changes' : 'All changes saved');
                continue;
            }
            setStatus('Saving…');
            let result;
            if (value.content.length > 500000) {
                const saveId=crypto.randomUUID();let parts=0,offset=0;
                while(offset<value.content.length){let end=Math.min(value.content.length,offset+250000);const code=value.content.charCodeAt(end-1);if(end<value.content.length&&code>=0xD800&&code<=0xDBFF)end--;await api({action:'save_part',client_id:clientId,save_id:saveId,part:parts++,content:value.content.slice(offset,end)});offset=end;}
                result = await api({ action: 'save_finish', client_id: clientId, save_id: saveId, parts, revision: revision.current, preview: value.preview });
            }
            else
                result = await api({ action: 'save', ...value, revision: revision.current, client_id: clientId });
            revision.current = result.revision;
            lastContent.current = value.content;
            if (!pending.current) dirty.current = changes.current !== value.generation;
            setStatus(dirty.current ? 'Unsaved changes' : 'All changes saved');
        }
    }
    catch (e) {
        blocked.current = true;
        setError((e as Error).message);
        setStatus('Changes not saved');
        throw e;
    }
    finally {
        saving.current = false;
    } };
    useEffect(() => { let cancelled = false; const before = (e: BeforeUnloadEvent) => { if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
    } }; const release = () => navigator.sendBeacon('/api/documents/' + id, new Blob([JSON.stringify({ action: 'release', client_id: clientId })], { type: 'application/json' })); addEventListener('beforeunload', before); addEventListener('pagehide', release); (async () => { try {
        const d = await api(undefined,'?metadata=1');if(d.content_length){let offset=0;const parts:string[]=[];while(offset<d.content_length){const part=await api(undefined,`?offset=${offset}&revision=${d.revision}`);if(!part.content||part.next_offset<=offset)throw new Error('Could not read the complete file. Please reopen it.');parts.push(part.content);offset=part.next_offset;}d.content=parts.join('');}
        if (cancelled)
            return;
        revision.current = d.revision;
        lastContent.current = d.content || '';
        permission.current = d.permission === 'edit';
        let lease = { editing: false, owner: null };
        if (permission.current)
            lease = await api({ action: 'lease', client_id: clientId });
        active.current = lease.editing;
        setEditing(lease.editing);
        setStatus(lease.editing ? 'All changes saved' : lease.owner ? `${lease.owner} is editing · View only` : 'View only');
        const module = d.kind === 'doc' ? await import('./word') : await import('./sheet');
        if (!cancelled) {
            setEngine(() => module.Editor);
            setDoc(d);
        }
    }
    catch (e) {
        setError((e as Error).message);
    } })(); const beat = setInterval(async () => { if (!active.current)
        return; try {
        const lease = await api({ action: 'lease', client_id: clientId });
        if (!lease.editing)
            throw new Error('Editing access has changed. Download a copy of your work before reopening.');
    }
    catch (e) {
        active.current = false;
        blocked.current = true;
        setEditing(false);
        setError((e as Error).message);
    } }, 25000); return () => { cancelled = true; clearInterval(beat); removeEventListener('beforeunload', before); removeEventListener('pagehide', release); release(); }; }, []);
    useEffect(() => { const rename = (event: MessageEvent) => { const m = event.data; if (event.origin === location.origin && event.source === window.parent && m?.type === 'tuitionhub:document-title' && m.id === id && typeof m.title === 'string' && m.title.trim() && m.title.length <= 200) setDoc((d: any) => d ? {...d, title: m.title} : d); }; addEventListener('message', rename); return () => removeEventListener('message', rename); }, []);
    const download = async () => { try {
        const result = await handle.current?.download();
        if (result) {
            const url = URL.createObjectURL(result);
            const a = document.createElement('a');
            a.href = url;
            a.download = (doc.title || 'Document') + (doc.kind === 'doc' ? '.docx' : '.xlsx');
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    }
    catch {
        setError('Could not export this file. Your changes remain in the editor.');
    } };
    return <div className="office-shell"><div className="office-status"><span className="office-state" role="status">{status}</span><button onClick={() => handle.current?.save()} disabled={!editing}>Save now</button>{error && editing && <button onClick={() => { blocked.current = false; setError(''); void handle.current?.save(); }}>Retry save</button>}<button onClick={download} disabled={!doc}>Download a copy</button>{!editing && permission.current && <button onClick={() => location.reload()}>Try editing</button>}</div>{error && <div role="alert" className="office-error">{error}{blocked.current && ' Download a copy before reloading to protect your work.'}</div>}<div className="office-body">{Engine && doc ? <Engine doc={doc} editing={editing} handle={handle} onDirty={() => { changes.current++; dirty.current = true; setStatus('Unsaved changes'); }} onSave={persist} onError={(e: Error) => setError(e.message)} preview={textPreview} decode={decode} encode={encode}/> : <div className="office-loading">{error ? 'Unable to open editor' : 'Opening your workspace…'}</div>}</div></div>;
}
createRoot(document.getElementById('root')!).render(<App />);
