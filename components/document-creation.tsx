"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {FileText,Sheet,Loader2,ArrowLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
export function DocumentCreation({kind,classId,autoStart}:{kind:'doc'|'sheet';classId?:number;autoStart:boolean}){
  const [pending,setPending]=useState(autoStart),[error,setError]=useState('');
  const identity=useRef(''),inFlight=useRef(false),started=useRef(false);
  async function create(){
    if(inFlight.current)return;
    inFlight.current=true;setPending(true);setError('');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
      if(!identity.current){
        const url=new URL(window.location.href),existing=url.searchParams.get('request_id');
        identity.current=existing&&/^[\w.-]{8,128}$/.test(existing)?existing:crypto.randomUUID();
        url.searchParams.set('request_id',identity.current);
        window.history.replaceState(window.history.state,'',url);
      }
      const response=await fetch('/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,class_id:classId,request_id:identity.current}),signal:controller.signal});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(result?.error||'Could not create your file. Please retry.');
      if(!/^[a-f0-9-]{36}$/.test(result?.id||''))throw new Error('The file could not be opened. Please retry.');
      try{localStorage.setItem('tuitionhub-documents-updated',identity.current+':'+Date.now());}catch{}
      window.location.replace('/documents/'+result.id);
    }catch(e){
      setError(e instanceof Error&&e.name==='AbortError'?'Creating your file is taking longer than expected. Retry to open the same file if it was already created.':e instanceof Error?e.message:'Could not create your file. Please retry.');
      setPending(false);
    }finally{clearTimeout(timer);inFlight.current=false;}
  }
  useEffect(()=>{if(autoStart&&!started.current){started.current=true;void create();}},[autoStart]);
  const Icon=kind==='doc'?FileText:Sheet,label=kind==='doc'?'document':'spreadsheet';
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6"><section className="w-full max-w-lg space-y-5 rounded-3xl border bg-card p-8 text-center shadow-sm"><Icon className={'mx-auto '+(kind==='doc'?'text-blue-600':'text-emerald-600')} size={38}/><h1 className="text-2xl font-bold">{pending?'Creating your '+label:error?'Unable to open your '+label:'New '+label}</h1>{pending?<div role="status" className="space-y-4"><Loader2 className="mx-auto animate-spin text-primary" size={25}/><p className="text-muted-foreground">Your editor will open here automatically.</p></div>:error?<><p role="alert" className="text-destructive">{error}</p><p className="text-sm text-muted-foreground">Retrying this request won’t create another copy.</p><Button onClick={()=>void create()}>Retry</Button></>:<><p className="text-muted-foreground">Create a new {label} in your workspace.</p><Button onClick={()=>void create()}>Create {label}</Button></>}<div><Link href={classId?`/meeting/${classId}/documents`:'/documents'} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/>Back to documents</Link></div></section></main>;
}
