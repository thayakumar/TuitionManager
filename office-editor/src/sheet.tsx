import React, { useRef, useEffect,useState } from 'react';
import JSZip from 'jszip';
async function blank() { const z = new JSZip(); z.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'); z.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'); z.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet 1" sheetId="1" r:id="rId1"/></sheets></workbook>'); z.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'); z.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'); return z.generateAsync({ type: 'arraybuffer' }); }
export function Editor({doc,editing,handle,onSave,onDirty,onError,preview}:any) {
  const frame=useRef<HTMLIFrameElement>(null),loaded=useRef(false),last=useRef('');
  const [dialog,setDialog]=useState<string|null>(null),initialEditing=useRef(editing),editingRef=useRef(editing);
  useEffect(()=>{editingRef.current=editing;const api=(frame.current?.contentWindow as any)?.__casualEmbedApi;if(api)api.setDocumentMode(editing?'editing':'viewing')},[editing]);
  useEffect(()=>{
    let cancelled=false,working=false;
    const send=(m:any)=>frame.current?.contentWindow?.postMessage({v:1,app:'sheet',...m},location.origin);
    const save=async()=>{
      const api=(frame.current?.contentWindow as any)?.__casualEmbedApi;
      if(!api||!loaded.current||!editingRef.current)return;
      const snapshot=api.getSnapshot(),text=JSON.stringify(snapshot);
      if(text!==last.current){onDirty();await onSave(text,preview(snapshot));last.current=text}
    };
    const listener=async(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow||event.origin!==location.origin)return;
      const m=event.data;if(m?.v!==1||m?.app!=='sheet')return;
      try{
        if(m.type==='casual.load.request'){
          const bytes=await blank();if(!cancelled)send({id:m.id,type:'casual.load.response',data:{ok:true,bytes,fileName:doc.title+'.xlsx',readOnly:!editingRef.current}})
        }
        if(m.type==='casual.error')onError(new Error(m.data?.message||'Spreadsheet error'));
        if(m.type==='casual.save.notify')await save();
        if(m.type==='casual.dialog.request'){
          if(['properties','about','keyboard-shortcuts'].includes(m.data?.kind))setDialog(m.data.kind);
          else onError(new Error('This spreadsheet option is unavailable in this editor version.'));
        }
      }catch(e){onError(e)}
    };
    addEventListener('message',listener);
    const timer=setInterval(async()=>{
      if(working)return;working=true;
      try{
        const api=(frame.current?.contentWindow as any)?.__casualEmbedApi;if(!api)return;
        if(!loaded.current){
          if(doc.content)await api.loadSnapshot(JSON.parse(doc.content));
          api.setDocumentMode(editingRef.current?'editing':'viewing');
          last.current=JSON.stringify(api.getSnapshot());loaded.current=true;
          handle.current={save:()=>{last.current='';return save().catch(onError)},download:()=>api.exportXlsx()};
        }else await save();
      }catch(e){onError(e)}finally{working=false}
    },1500);
    return()=>{cancelled=true;clearInterval(timer);removeEventListener('message',listener)};
  },[]);
  return <>
    <iframe ref={frame} title="Spreadsheet canvas" style={{width:'100%',height:'100%',border:0}} src={`/office-editor/sheets/embed.html?app=sheet&docId=${doc.id}&viewMode=${initialEditing.current?'editor':'preview'}&theme=light`}/>
    {dialog&&<div className="office-modal-backdrop" onKeyDown={e=>{if(e.key==='Escape')setDialog(null)}}><section role="dialog" aria-modal="true" aria-label={dialog==='properties'?'File properties':dialog==='about'?'About this editor':'Keyboard shortcuts'} className="office-modal">
      <h2>{dialog==='properties'?'File properties':dialog==='about'?'About this editor':'Keyboard shortcuts'}</h2>
      {dialog==='properties'?<><p><strong>{doc.title}</strong></p><p>Spreadsheet · {Object.keys((frame.current?.contentWindow as any)?.__casualEmbedApi?.getSnapshot()?.sheets||{}).length} worksheets</p><p>Saved in your TuitionHub workspace.</p></>:dialog==='about'?<><p>Powered by CasualOffice Sheets 0.20.0.</p><p><a href="https://github.com/CasualOffice/sheets" target="_blank" rel="noreferrer">Project and licences</a></p></>:<dl><dt>Save</dt><dd>Ctrl / Cmd + S</dd><dt>Undo / Redo</dt><dd>Ctrl / Cmd + Z / Shift + Z</dd><dt>Copy / Paste</dt><dd>Ctrl / Cmd + C / V</dd><dt>Find</dt><dd>Ctrl / Cmd + F</dd><dt>Edit selected cell</dt><dd>F2 or double-click</dd></dl>}
      <button autoFocus onClick={()=>setDialog(null)}>Close</button>
    </section></div>}
  </>;
}
