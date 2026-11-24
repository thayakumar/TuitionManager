"use client";
import {useEffect,useState,useRef} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {toast} from 'sonner';
import {Bell,MessageSquare,X} from 'lucide-react';
import {useNotificationSound} from './use-notification-sound';
import {markNotificationRead} from '@/lib/actions';
import {NotificationCountContext,type NotificationCounts} from './notification-context';
import {freshAlerts,safeAlertHref,type AlertWatermarks} from '@/lib/domain/notification-alerts';
import type {AlertNotice,AlertCursor} from '@/lib/notification-feed';
function targetFor(path:string){if(/^\/portal\/(admin|student)\/?$/.test(path)||path.startsWith('/oauth/')||path==='/login')return null;const parent=/^\/share\/([^/]+)/.exec(path);if(parent){try{return{key:'parent:'+parent[1],viewer:'parent',parentToken:decodeURIComponent(parent[1])}}catch{return null}};const student=/^\/portal\/student\/(\d+)/.exec(path);if(student)return{key:'student:'+student[1],viewer:'student'};if(path.startsWith('/portal')||path.startsWith('/share'))return null;return{key:/^\/(meeting|documents)\//.test(path)||path==='/whiteboard'?'auto':'admin',viewer:/^\/(meeting|documents)\//.test(path)||path==='/whiteboard'?'auto':'admin'}}
const memory=new Map<string,AlertWatermarks>();
async function claim(scope:string,notices:AlertNotice[]):Promise<AlertNotice[]>{
  if(!notices.length)return[];
  const key='tuitionhub-alerts:'+scope;
  const cached=()=>{try{const value=localStorage.getItem(key);return value?JSON.parse(value):memory.get(scope)}catch{return memory.get(scope)}};
  const remember=(next:AlertWatermarks)=>{memory.set(scope,next);try{localStorage.setItem(key,JSON.stringify(next))}catch{}};
  const work=async()=>{
    try{
      const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('tuitionhub-notification-alerts',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('scopes'))request.result.createObjectStore('scopes')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
      return await new Promise<AlertNotice[]>((resolve,reject)=>{
        const tx=db.transaction('scopes','readwrite'),store=tx.objectStore('scopes'),request=store.get(scope);let selected:ReturnType<typeof freshAlerts<AlertNotice>>;
        request.onsuccess=()=>{const one=freshAlerts([],request.result).next,two=freshAlerts([],cached()).next;selected=freshAlerts(notices,{notification:Math.max(one.notification,two.notification),chat:Math.max(one.chat,two.chat)});store.put(selected.next,scope)};
        tx.oncomplete=()=>{db.close();remember(selected.next);resolve(selected.fresh)};
        tx.onabort=tx.onerror=()=>{db.close();reject(tx.error)};
      });
    }catch{const selected=freshAlerts(notices,cached());remember(selected.next);return selected.fresh}
  };
  return navigator.locks?navigator.locks.request('tuitionhub-alerts:'+scope,work):work();
}
export function NotificationProvider({children}:{children:React.ReactNode}){const playSound=useNotificationSound();const pathname=usePathname(),[counts,setCounts]=useState<NotificationCounts>(null),currentPath=useRef(pathname),toastIds=useRef(new Set<string>());currentPath.current=pathname;const target=targetFor(pathname),key=target?.key||'';
useEffect(()=>{let alive=true,pending=false,suspended=false,scope='',cursor:AlertCursor|undefined;const controller=new AbortController();const clear=()=>{for(const id of toastIds.current)toast.dismiss(id);toastIds.current.clear()};clear();setCounts(null);if(!target)return;
function show(item:AlertNotice,role:string){const fallback=role==='admin'?'/notifications':role==='parent'?'/share/'+encodeURIComponent(target!.parentToken!)+'/chat':'/portal/student/'+scope.split(':')[1]+'/notifications';const href=safeAlertHref(item.href,fallback);if(item.kind==='chat'&&currentPath.current===href)return false;const id='incoming:'+scope+':'+item.kind+':'+(item.kind==='chat'?href:item.id);toastIds.current.add(id);const Icon=item.kind==='chat'?MessageSquare:Bell;const keepOpen=/^\/(meeting|documents)\//.test(currentPath.current)||currentPath.current==='/whiteboard';toast.custom(()=> <div className="relative w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-600 bg-slate-950 text-white shadow-2xl ring-1 ring-white/10"><Link href={href} target={keepOpen?'_blank':undefined} rel={keepOpen?'noopener noreferrer':undefined} data-busy-ignore className="flex w-full items-start gap-3 rounded-2xl p-4 pr-10 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300" onClick={()=>{toast.dismiss(id);toastIds.current.delete(id);if(item.kind==='notification')void markNotificationRead(item.id).then(()=>window.dispatchEvent(new Event('notifications-changed'))).catch(()=>{})}}><span className="mt-0.5 shrink-0 rounded-xl bg-orange-400/15 p-2 text-orange-300"><Icon size={21}/></span><span className="min-w-0 flex-1"><span className="mb-1 block text-base font-bold leading-snug">{item.title}</span><span className="line-clamp-2 text-sm leading-relaxed text-slate-200">{item.message}</span></span></Link><button className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-slate-300 hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300" aria-label={'Dismiss notification: '+item.title} onClick={()=>{toast.dismiss(id);toastIds.current.delete(id)}}><X size={17}/></button></div>,{id,duration:8000,closeButton:false,onDismiss:()=>toastIds.current.delete(id),onAutoClose:()=>toastIds.current.delete(id)});return true;}
async function refresh(){if(pending||document.hidden||!alive||suspended)return;pending=true;try{const q=new URLSearchParams({viewer:target!.viewer,...(target!.parentToken?{parentToken:target!.parentToken}:{}),...(cursor?{scope,notification:String(cursor.notification),chat:String(cursor.chat)}:{})});const response=await fetch('/api/notifications/live?'+q,{cache:'no-store',signal:controller.signal});if(!response.ok){if(response.status===401||response.status===403){suspended=true;scope='';cursor=undefined;clear();if(alive)setCounts(null)}return}const data=await response.json();if(!alive)return;const first=!scope||scope!==data.scope||data.baseline;if(scope&&scope!==data.scope)clear();scope=data.scope;cursor=data.cursor;setCounts({role:data.role,scope,unreadCount:data.unreadCount,chatUnreadCount:data.chatUnreadCount,parentToken:target!.parentToken});if(!first){const items=await claim(scope,data.notices);if(!alive)return;let shown=false;for(const item of items)shown=show(item,data.role)||shown;if(shown)playSound()}}catch{}finally{pending=false}}
void refresh();const interval=setInterval(()=>void refresh(),5000),update=()=>{suspended=false;void refresh()};window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);window.addEventListener('notifications-changed',update);window.addEventListener('family-chats-changed',update);return()=>{alive=false;controller.abort();clearInterval(interval);clear();window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);window.removeEventListener('notifications-changed',update);window.removeEventListener('family-chats-changed',update)};
// Role context is stable across normal page navigation; do not replay history.
// eslint-disable-next-line react-hooks/exhaustive-deps
},[key,playSound]);return <NotificationCountContext.Provider value={counts}>{children}</NotificationCountContext.Provider>}
