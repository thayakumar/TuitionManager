"use client";
import {useEffect,useRef,useState} from 'react';
import {privateChatBody,restoreOutbox,reconcileOutbox,type OutboxItem} from '@/lib/chat-outbox';
export function useChatOutbox({identity,send,onConfirmed}:{identity:string;send:(item:OutboxItem)=>Promise<unknown>;onConfirmed:(item:OutboxItem,message:unknown)=>void}) {
  const [items,setItems]=useState<OutboxItem[]>([]),[scope,setScope]=useState<string|null>(null),[wake,setWake]=useState(0);
  const storageKey=useRef<string|null>(null),inFlight=useRef<string|null>(null),handlers=useRef({send,onConfirmed});
  handlers.current={send,onConfirmed};
  const currentIdentity=useRef(identity);currentIdentity.current=identity;
  useEffect(()=>{
    let live=true;storageKey.current=null;setScope(null);setItems([]);
    void crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)).then(hash=>{
      if(!live)return;
      const key='tuition-chat-outbox:'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
      let restored:OutboxItem[]=[];try{restored=restoreOutbox(sessionStorage.getItem(key))}catch{}
      storageKey.current=key;setItems(restored);setScope(identity);
    }).catch(()=>{if(live)setScope(identity)});
    return()=>{live=false};
  },[identity]);
  useEffect(()=>{if(scope!==identity||!storageKey.current)return;try{sessionStorage.setItem(storageKey.current,JSON.stringify(items))}catch{}},[items,scope,identity]);
  useEffect(()=>{
    if(scope!==identity||inFlight.current)return;
    const item=items.find(m=>m.status==='queued');if(!item)return;
    inFlight.current=item.clientId;
    const activeIdentity=identity;
    setItems(old=>old.map(m=>m.clientId===item.clientId?{...m,status:'sending',error:undefined}:m));
    void handlers.current.send(item).then(message=>{
      if(currentIdentity.current===activeIdentity)handlers.current.onConfirmed(item,message);
      setItems(old=>old.filter(m=>m.clientId!==item.clientId));
    }).catch(error=>{
      setItems(old=>old.map(m=>m.clientId===item.clientId?{...m,status:'failed',error:error instanceof Error?error.message:'Could not confirm delivery. Retry this message.'}:m));
    }).finally(()=>{inFlight.current=null;setWake(n=>n+1)});
  },[items,scope,identity,wake]);
  return {
    items:scope===identity?items:[],ready:scope===identity,
    enqueue(item:Omit<OutboxItem,'status'>){setItems(old=>[...old,{...item,body:privateChatBody(item.body),status:'queued'}])},
    retry(clientId:string){setItems(old=>old.map(m=>m.clientId===clientId&&m.status==='failed'?{...m,status:'queued',error:undefined}:m))},
    reconcile(studentId:number,ids:string[]){setItems(old=>{const next=reconcileOutbox(old,studentId,ids);return next.length===old.length?old:next})},
  };
}
