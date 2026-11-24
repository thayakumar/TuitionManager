import React, {useEffect, useRef, useState} from 'react';
import {Editor as LegacyEditor} from './legacy-sheet';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Keep saved CasualOffice work in its original engine; never reinterpret JSON as XLSX. */
export function Editor(props: any) {
  const previewOnly = useRef(!props.editing).current;
  const saved = props.doc.content ? JSON.parse(props.doc.content) : null;
  if ((saved && saved.format !== 'xlsx') || previewOnly) return <LegacyEditor {...props}/>;
  return <GridcraftEditor {...props}/>;
}

function GridcraftEditor({doc, editing, handle, onSave, onDirty, onError, decode}: any) {
  const frame = useRef<HTMLIFrameElement>(null), editingRef = useRef(editing);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  editingRef.current = editing;

  useEffect(() => {
    let cancelled = false, loaded = false, working = false, intent = false;
    let last = '', cleanupInput = () => {};
    const api = () => (frame.current?.contentWindow as any)?.gridcraft;
    const report = (e: unknown) => { if (!cancelled) onError(e instanceof Error ? e : new Error(String(e))); };
    const mark = () => { if (loaded && editingRef.current) { intent = true; onDirty(); } };
    const preview = async () => {
      try {
        const state = await api().docInspect();
        const cells = await api().request('sheet.read', {range: 'A1:H12', sheet: state.activeSheet, formatted: true});
        return [...state.sheets.map((s: any) => s.name), ...cells.values.flat().filter((v: any) => v !== null && v !== '').slice(0, 40)].join(' · ').slice(0, 600);
      } catch { return doc.preview || ''; }
    };
    const snapshot = () => api().execute('file.saveBytes', {format: 'xlsx'});
    const persist = async (base64: string, force = false, text = doc.preview || '') => {
      if (!editingRef.current || cancelled) return;
      if (base64 !== last || intent || force) {
        intent = false;
        if (base64 !== last) onDirty();
        await onSave(JSON.stringify({format: 'xlsx', engine: 'gridcraft', data: base64}), text);
        last = base64;
      }
    };
    const save = async (force = false) => {
      if (!loaded || working || !editingRef.current) return;
      working = true;
      try {
        const ui = await api().uiInspect();
        if (ui.editor) {
          if (!force) return; // Do not call an uncommitted cell draft saved.
          await api().request('ui.edit.commit', {move: 'none'});
        }
        const text = await preview(), data = await snapshot();
        if (!cancelled) await persist(data.base64, force, text);
      }
      finally { working = false; }
    };
    const message = async (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      const m = event.data;
      if (m?.type === 'gridcraft:failed') { setFailed(true); report(new Error(m.error || 'Gridcraft could not start.')); }
      if (m?.type === 'gridcraft:dirty' && m.dirty) mark();
      if (m?.type !== 'gridcraft:save' || !loaded || !editingRef.current) return;
      try {
        const bytes = m.bytes instanceof ArrayBuffer ? m.bytes : m.bytes?.buffer;
        if (!bytes) throw new Error('The spreadsheet did not return a file.');
        if (/\.xlsx$/i.test(m.name)) {
          // Serialize through the autosave lane, rather than racing an older native save.
          intent = true;
          await save(true);
        } else {
          // PDF and other exports are downloads, never replacements for the workbook.
          const url = URL.createObjectURL(new Blob([bytes]));
          const link = document.createElement('a'); link.href = url; link.download = String(m.name || 'Export'); link.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      } catch (e) { report(e); }
    };
    const start = Date.now();
    const timer = setInterval(async () => {
      if (working || cancelled) return;
      if (!loaded) {
        if (!api()) {
          if (Date.now() - start > 60000) { clearInterval(timer); setFailed(true); report(new Error('Gridcraft is taking too long to start. Reload to retry; the saved file is unchanged.')); }
          return;
        }
        working = true;
        try {
          const saved = doc.content ? JSON.parse(doc.content) : null;
          if (saved?.format === 'xlsx') await api().execute('file.open', {name: doc.title + '.xlsx', base64: saved.data});
          last = (await snapshot()).base64;
          if (cancelled) return;
          loaded = true;
          const inner = frame.current!.contentWindow!;
          const key = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && ['o', 'n', 'w'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopImmediatePropagation(); return; }
            if (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key)) mark();
          };
          // Conservative unsaved protection also covers formatting via the canvas ribbon.
          inner.addEventListener('keydown', key, true);
          inner.addEventListener('pointerup', mark, true);
          inner.addEventListener('paste', mark, true);
          cleanupInput = () => { inner.removeEventListener('keydown', key, true); inner.removeEventListener('pointerup', mark, true); inner.removeEventListener('paste', mark, true); };
          handle.current = {
            save: () => save(true).catch(report),
            download: async () => {
              if ((await api().uiInspect()).editor) await api().request('ui.edit.commit', {move: 'none'});
              return new Blob([decode((await snapshot()).base64)], {type: MIME});
            },
          };
          setReady(true);
        } catch (e) { clearInterval(timer); setFailed(true); report(e); }
        finally { working = false; }
      } else {
        try { await save(); } catch (e) { report(e); }
      }
    }, 2000);
    addEventListener('message', message);
    return () => { cancelled = true; clearInterval(timer); cleanupInput(); removeEventListener('message', message); handle.current = null; };
  }, []);

  return <div style={{height: '100%', position: 'relative'}}>
    <iframe ref={frame} title="Gridcraft spreadsheet" src="/office-editor/gridcraft/index.html?host=parent&chrome=none" allow="clipboard-read; clipboard-write; fullscreen" style={{width: '100%', height: '100%', border: 0, visibility: ready ? 'visible' : 'hidden'}}/>
    {!ready && <div className="office-loading" role="status" style={{position: 'absolute', inset: 0}}>{failed ? 'Unable to open Gridcraft. Reload to try again.' : 'Opening Gridcraft…'}</div>}
    {ready && !editing && <div style={{position: 'absolute', inset: 0, background: '#ffffffaa', display: 'grid', placeItems: 'center'}}><p>Editing access changed. Download your work before reopening.</p></div>}
  </div>;
}
