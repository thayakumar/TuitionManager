"use client";

import {useRef, useState} from 'react';
import {Check, Loader2, Pencil, X} from 'lucide-react';

export function DocumentTitle({id, title: initialTitle, canRename}: {id: string; title: string; canRename: boolean}) {
  const [title, setTitle] = useState(initialTitle), [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  const cancel = () => { if (!pending.current) { setDraft(title); setError(''); setEditing(false); } };
  const save = async () => {
    if (pending.current) return;
    const next = draft.trim();
    if (!next || next.length > 200) { setError('Use a name between 1 and 200 characters.'); return; }
    if (next === title) { setEditing(false); setError(''); return; }
    pending.current = true; setSaving(true); setError('');
    try {
      const response = await fetch('/api/documents/' + id, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'rename', title: next})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not rename this file.');
      setTitle(next); setDraft(next); setEditing(false);
      // Keep the loaded editor and unsaved work intact; update its export name without a refresh.
      const frame = document.querySelector<HTMLIFrameElement>('iframe[src^="/office-editor/index.html"]');
      frame?.contentWindow?.postMessage({type: 'tuitionhub:document-title', id, title: next}, location.origin);
      try { localStorage.setItem('tuitionhub-documents-updated', String(Date.now())); } catch {}
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not rename this file. Try again.'); }
    finally { pending.current = false; setSaving(false); }
  };
  if (!canRename) return <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>;
  return <div className={"relative min-w-0 flex-1" + (editing ? " max-sm:absolute max-sm:inset-x-2 max-sm:top-2 max-sm:z-20 max-sm:rounded-xl max-sm:border max-sm:bg-white max-sm:p-2 max-sm:shadow-lg" : "")}>
    {editing ? <div className="flex min-w-0 items-center gap-1">
      <input autoFocus aria-label="File name" maxLength={200} value={draft} disabled={saving} onFocus={e => e.currentTarget.select()} onChange={e => {setDraft(e.target.value); setError('');}} onKeyDown={e => {if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') {e.preventDefault(); void save();} if (e.key === 'Escape') {e.preventDefault(); cancel();}}} className="min-w-0 w-full rounded-lg border border-primary bg-white px-2 py-1.5 text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/20"/>
      <button aria-label="Save file name" title="Save name" disabled={saving} onClick={() => void save()} className="shrink-0 rounded-lg p-2 hover:bg-muted disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin"/> : <Check size={18}/>}</button>
      <button aria-label="Cancel rename" title="Cancel" disabled={saving} onClick={cancel} className="shrink-0 rounded-lg p-2 hover:bg-muted disabled:opacity-50"><X size={18}/></button>
    </div> : <h1 className="min-w-0"><button title="Rename file" aria-label={'Rename ' + title} onClick={() => {setDraft(title); setEditing(true); setError('');}} className="group flex max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-lg font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="truncate">{title}</span><Pencil size={15} className="shrink-0 text-muted-foreground"/></button></h1>}
    {error && <p role="alert" className="absolute left-0 top-full z-10 mt-1 max-w-full rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 shadow-sm">{error}</p>}
    <span className="sr-only" role="status">{saving ? 'Saving file name' : ''}</span>
  </div>;
}
