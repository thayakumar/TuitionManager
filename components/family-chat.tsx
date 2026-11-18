"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, GraduationCap, LoaderCircle, MessageCircle, Paperclip, Pencil, Reply, Search, Send, Trash2, UserRound, Users, X } from "lucide-react";
import { useChatOutbox } from "@/components/use-chat-outbox";
import { RichText } from "@/components/rich-text";
import { RichTextEditor } from "@/components/rich-text-editor";
import { AttachmentCard } from "@/components/attachment-preview";
import { uploadFile } from "@/lib/upload-client";
import { hasRichTextContent } from "@/lib/rich-text";
import { SUPPORTED_UPLOAD_ACCEPT } from "@/lib/upload-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ChatRole = "admin" | "student" | "parent";
type FileAttachment = { fileUrl: string; fileName: string; fileType?: string };
type ChatRoom = { id: number; studentId: number; studentName: string; profilePhotoUrl?: string | null; lastMessage?: string | null; lastMessageAt?: string | null; unreadCount: number };
type ChatMessage = { id: number; clientId?:string|null; delivery?:"queued"|"sending"|"failed"; deliveryError?:string; body: string; authorRole: ChatRole; authorName: string; isOwn: boolean; canEdit: boolean; canDelete: boolean; createdAt: string; editedAt?: string | null; deletedAt?: string | null; attachments: FileAttachment[]; replyTo?: number | { id: number; body?: string; authorName?: string } | null; readBy?: ChatRole[]; authorPhoto?: string | null; replyPreview?: { id: number; body?: string; authorName?: string; deletedAt?: string | null } | null; profilePhotoUrl?: string | null };
type Draft = { body: string; attachments: FileAttachment[]; reply: ChatMessage | null };

function plain(value?: string | null) { return (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
function time(value: string) { const date = new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z"); return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : ""; }
function day(value: string) { const date = new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z"); return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : ""; }
function query(role: ChatRole, parentToken?: string) { const q = new URLSearchParams({ viewer: role }); if (parentToken) q.set("parentToken", parentToken); return q; }
function merge(old: ChatMessage[], next: ChatMessage[]) { const map = new Map(old.map(m => [m.id, m])); for (const m of next) map.set(m.id, m); return [...map.values()].sort((a, b) => a.id - b.id); }
function photoUrl(url: string | null | undefined, parentToken?: string) { if (!url) return undefined; return parentToken && url.startsWith("/api/files/") ? url + (url.includes("?") ? "&" : "?") + "parent_token=" + encodeURIComponent(parentToken) : url; }

export function FamilyChat({ role, studentId, parentToken }: { role: ChatRole; studentId?: number; parentToken?: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]), [selected, setSelected] = useState<number | null>(studentId || null), [search, setSearch] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]), [loading, setLoading] = useState(true), [historyBusy, setHistoryBusy] = useState(false), [hasMore, setHasMore] = useState(false), [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState(""), [body, setBody] = useState(""), [attachments, setAttachments] = useState<FileAttachment[]>([]), [reply, setReply] = useState<ChatMessage | null>(null), [editing, setEditing] = useState<ChatMessage | null>(null), [deleting, setDeleting] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [editorBusy, setEditorBusy] = useState(false), [editorError, setEditorError] = useState(false), [progress, setProgress] = useState(0);
  const list = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), drafts = useRef(new Map<number, Draft>()), latest = useRef(0), read = useRef(0), requestKey = useRef<string | null>(null), sending = useRef(false), loadedIds = useRef<number[]>([]), atBottom = useRef(true);
  useEffect(() => { loadedIds.current = messages.map(m => m.id); }, [messages]);
  useEffect(() => { requestKey.current = null; }, [body, attachments, reply, editing]);
  const selectedRef=useRef(selected);selectedRef.current=selected;
  const room = rooms.find(r => r.studentId === selected);
  const endpoint = selected ? "/api/chats/" + selected : "";
  const locked = busy || uploading || editorBusy;
  const refreshRooms = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch("/api/chats?" + query(role, parentToken), { cache: "no-store", signal });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Your chats could not be loaded."); setRooms(data.rooms || []); setRoomsLoading(false);
  }, [role, parentToken]);
  const action = useCallback(async (student: number, values: Record<string, unknown>) => {
    const r = await fetch("/api/chats/" + student, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, viewer: role, parentToken }), signal: AbortSignal.timeout(20000) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Your message could not be saved. Please try again."); return data;
  }, [role, parentToken]);
  const outbox = useChatOutbox({
    identity: role + ":" + (studentId || "inbox") + ":" + (parentToken || ""),
    send: async item => {
      const data=await action(item.studentId,{action:"send",body:item.body,attachments:item.attachments,replyTo:item.replyTo,clientId:item.clientId});
      if(!data.message || !Number.isSafeInteger(data.message.id))throw new Error("Delivery confirmation was interrupted. Retry to confirm this message.");
      return data.message;
    },
    onConfirmed: (item,message) => {
      if(selectedRef.current===item.studentId)setMessages(old=>merge(old,[message as ChatMessage]));
      setRooms(old=>old.map(r=>r.studentId===item.studentId?{...r,lastMessage:(message as ChatMessage).body,lastMessageAt:(message as ChatMessage).createdAt}:r));
      window.dispatchEvent(new Event("family-chats-changed"));
    },
  });
  useEffect(()=>{
    if(selected)outbox.reconcile(selected,messages.filter(m=>m.isOwn&&m.clientId).map(m=>m.clientId!));
  },[messages,selected]);
  const displayedMessages:ChatMessage[]=[...messages,...outbox.items.filter(m=>m.studentId===selected&&!messages.some(saved=>saved.isOwn&&saved.clientId===m.clientId)).map((m,index)=>({
    id:-(index+1),clientId:m.clientId,body:m.body,attachments:m.attachments,createdAt:m.createdAt,authorRole:role,
    authorName:role==="admin"?"Tutor":role==="parent"?"Parent":room?.studentName||"You",isOwn:true,canEdit:false,canDelete:false,
    replyTo:m.replyTo,replyPreview:m.replyPreview,readBy:[],delivery:m.status,deliveryError:m.error,
    authorPhoto:role==="student"?room?.profilePhotoUrl:null,
  }))];
  useEffect(() => {
    const controller = new AbortController(); let pending = false;
    async function update() { if (pending || document.hidden) return; pending = true; try { await refreshRooms(controller.signal); } catch (e) { if (!controller.signal.aborted) { setRoomsLoading(false); setError(e instanceof Error ? e.message : "Could not load chats."); } } finally { pending = false; } }
    void update(); const timer = setInterval(() => void update(), 10000); const focus = () => void update(); window.addEventListener("focus", focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [refreshRooms]);
  useEffect(() => {
    if (!selected) { setLoading(false); return; }
    const controller = new AbortController(); let live = true, pending = false, pollPass = 0;
    setMessages([]); setLoading(true); setError(""); latest.current = 0; read.current = 0; loadedIds.current = []; atBottom.current = true;
    async function update() {
      if (pending || document.hidden) return; pending = true;
      try {
        // A current-page snapshot also refreshes edits, removals and read receipts.
        const q = query(role, parentToken);
        const snapshot=!latest.current || (++pollPass % 2 === 0);
        if(snapshot && loadedIds.current.length)q.set("refreshIds",loadedIds.current.slice(0,200).join(","));
        else if(!snapshot)q.set("after",String(latest.current));
        const r = await fetch("/api/chats/" + selected + "?" + q, { cache: "no-store", signal: controller.signal });
        const data = await r.json(); if (!r.ok) throw new Error(data.error || "Messages could not be loaded."); if (!live) return;
        const incoming: ChatMessage[] = data.messages || [];
        for (let offset = 200; snapshot && offset < loadedIds.current.length; offset += 200) {
          const olderQuery = query(role, parentToken); olderQuery.set("refreshIds", loadedIds.current.slice(offset, offset + 200).join(","));
          const oldResponse = await fetch("/api/chats/" + selected + "?" + olderQuery, { cache: "no-store", signal: controller.signal });
          if (oldResponse.ok) incoming.push(...((await oldResponse.json()).messages || []));
        }
        setMessages(old => merge(old, incoming).map(m=>data.readPositions?{...m,readBy:data.readPositions.filter((r:{role:ChatRole;lastReadId:number})=>r.lastReadId>=m.id).map((r:{role:ChatRole})=>r.role)}:m)); if (!latest.current) setHasMore(!!data.hasMore); latest.current = Math.max(latest.current, ...incoming.map(m => m.id), 0); setLoading(false);
        if (atBottom.current) requestAnimationFrame(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; });
        if (latest.current > read.current && !document.hidden && atBottom.current) {
          await action(selected!, { action: "read", lastReadId: latest.current }); if (!live) return; read.current = latest.current;
          setRooms(old => old.map(r => r.studentId === selected ? { ...r, unreadCount: 0 } : r)); window.dispatchEvent(new Event("family-chats-changed"));
        }
      } catch (e) { if (live && !controller.signal.aborted) { setLoading(false); setError(e instanceof Error ? e.message : "Messages could not be loaded."); } } finally { pending = false; }
    }
    void update(); const timer = setInterval(() => void update(), 2000); const focus = () => void update(); window.addEventListener("focus", focus); document.addEventListener("visibilitychange", focus);
    return () => { live = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, [selected, role, parentToken, action]);
  function chooseRoom(id: number | null) {
    if (locked) return;
    if (selected) drafts.current.set(selected, { body, attachments, reply });
    const next = id ? drafts.current.get(id) : null; setBody(next?.body || ""); setAttachments(next?.attachments || []); setReply(next?.reply || null); setEditing(null); setSelected(id); setEditorError(false); requestKey.current = null;
  }
  async function older() {
    if (!selected || !messages.length || historyBusy) return;
    setHistoryBusy(true); const oldHeight = list.current?.scrollHeight || 0;
    try { const q = query(role, parentToken); q.set("before", String(messages[0].id)); const r = await fetch(endpoint + "?" + q, { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Earlier messages could not be loaded."); setMessages(old => merge(old, data.messages || [])); setHasMore(!!data.hasMore); requestAnimationFrame(() => { if (list.current) list.current.scrollTop += list.current.scrollHeight - oldHeight; }); }
    catch (e) { setError(e instanceof Error ? e.message : "Earlier messages could not be loaded."); } finally { setHistoryBusy(false); }
  }
  async function attach(files: FileList | null) {
    if (!files?.length || locked || sending.current) return;
    setUploading(true); setError("");
    try { for (const file of Array.from(files)) { const result = await uploadFile(file, { onProgress: setProgress, role, parentToken }); setAttachments(old => [...old, { fileUrl: result.fileUrl, fileName: result.fileName, fileType: result.fileType }]); } }
    catch (e) { setError(e instanceof Error ? e.message : "Your attachment could not be uploaded."); } finally { setUploading(false); setProgress(0); if (input.current) input.current.value = ""; }
  }
  async function send() {
    if (!selected || !outbox.ready || locked || editorError || sending.current || (!hasRichTextContent(body) && !attachments.length)) return;
    if(!editing){
      sending.current=true;
      outbox.enqueue({clientId:crypto.randomUUID(),studentId:selected,body,attachments:[...attachments],replyTo:reply?.id||null,replyPreview:reply?{id:reply.id,body:reply.body,authorName:reply.authorName}:null,createdAt:new Date().toISOString()});
      setBody("");setAttachments([]);setReply(null);setError("");drafts.current.delete(selected);atBottom.current=true;
      requestAnimationFrame(()=>{sending.current=false;if(list.current)list.current.scrollTop=list.current.scrollHeight});
      return;
    }
    sending.current = true; setBusy(true); setError("");
    try {
      const data=await action(selected,{ action: "edit", messageId: editing.id, body, attachments });
      if(data.message)setMessages(old=>merge(old,[data.message]));
      setBody(""); setAttachments([]); setReply(null); setEditing(null); drafts.current.delete(selected); requestKey.current = null;
      window.dispatchEvent(new Event("family-chats-changed")); void refreshRooms();
    } catch (e) { setError(e instanceof Error ? e.message : "Your changes could not be saved. Your draft is still here."); } finally { sending.current = false; setBusy(false); }
  }
  async function remove() {
    if (!selected || !deleting || busy) return; setBusy(true); setError("");
    try { await action(selected, { action: "delete", messageId: deleting.id }); setMessages(old => old.map(m => m.id === deleting.id ? { ...m, body: "", attachments: [], deletedAt: new Date().toISOString() } : m)); setDeleting(null); void refreshRooms(); window.dispatchEvent(new Event("family-chats-changed")); }
    catch (e) { setError(e instanceof Error ? e.message : "This message could not be removed."); } finally { setBusy(false); }
  }
  function edit(message: ChatMessage) { if (selected) drafts.current.set(selected, { body, attachments, reply }); setEditing(message); setBody(message.body); setAttachments(message.attachments || []); setReply(null); requestKey.current = null; }
  function cancelEdit() { const saved = selected ? drafts.current.get(selected) : null; setEditing(null); setBody(saved?.body || ""); setAttachments(saved?.attachments || []); setReply(saved?.reply || null); }
  const filtered = rooms.filter(r => r.studentName.toLowerCase().includes(search.toLowerCase()) || plain(r.lastMessage).toLowerCase().includes(search.toLowerCase()));
  return <section aria-label="Family chats" className="flex h-[calc(100dvh-11rem)] min-h-[34rem] min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:h-[calc(100dvh-9rem)]">
    {role === "admin" && <aside className={(selected ? "hidden md:flex " : "flex ") + "w-full min-w-0 shrink-0 flex-col border-r border-border md:w-72 xl:w-80"} aria-label="Student chat rooms">
      <div className="border-b border-border p-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle size={22}/>Family chats</h2><div className="relative mt-4"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground"/><Input aria-label="Search family chats" placeholder="Search students or messages" value={search} onChange={e => setSearch(e.target.value)} className="pl-10"/></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto">{error && !selected && <p role="alert" className="m-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{roomsLoading ? <p role="status" className="flex items-center gap-2 p-5 text-muted-foreground"><LoaderCircle size={18} className="animate-spin"/>Loading chats…</p> : !filtered.length ? <p className="p-5 text-sm text-muted-foreground">{search ? "No chats match your search." : "Your students’ family chats will appear here."}</p> : filtered.map(r => <button key={r.studentId} onClick={() => chooseRoom(r.studentId)} disabled={locked} aria-current={selected === r.studentId ? "true" : undefined} className={"flex w-full min-w-0 items-center gap-3 border-b border-border/60 p-4 text-left transition-colors hover:bg-secondary/50 " + (selected === r.studentId ? "bg-orange-50" : "")}><div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-orange-700">{r.profilePhotoUrl ? <img alt="" src={r.profilePhotoUrl} className="size-full object-cover"/> : <Users size={22}/>}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.studentName}</p><p className="mt-1 truncate text-sm text-muted-foreground">{plain(r.lastMessage) || "Tutor · Student · Parent"}</p></div>{r.unreadCount > 0 && <span aria-label={r.unreadCount + " unread messages"} className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">{r.unreadCount > 99 ? "99+" : r.unreadCount}</span>}</button>)}</div>
    </aside>}
    <div className={(role === "admin" && !selected ? "hidden md:flex " : "flex ") + "min-w-0 flex-1 flex-col"}>
      {!selected ? <div className="flex flex-1 flex-col items-center justify-center p-6 text-center"><div className="mb-4 rounded-full bg-orange-50 p-5 text-orange-600"><MessageCircle size={40}/></div><h2 className="text-xl font-semibold">Your family conversations</h2><p className="mt-2 max-w-sm text-muted-foreground">Choose a student to chat together with their parent.</p></div> : <>
        <header className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3">{role === "admin" && <button aria-label="Back to chat list" onClick={() => chooseRoom(null)} disabled={locked} className="rounded-lg p-2 md:hidden"><ArrowLeft size={21}/></button>}<div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-orange-600">{room?.profilePhotoUrl ? <img src={photoUrl(room.profilePhotoUrl, parentToken)} alt="" className="size-full object-cover"/> : <Users size={22}/>}</div><div className="min-w-0"><h2 className="truncate text-base font-semibold">{room?.studentName || "Family chat"}</h2><p className="text-xs text-muted-foreground">Tutor · Student · Parent</p></div></header>
        {error && <div role="alert" className="flex items-start justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button onClick={() => setError("")} aria-label="Dismiss chat error"><X size={17}/></button></div>}
        <div ref={list} role="log" aria-label="Family messages" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-orange-50/30 p-3 sm:p-5" onScroll={() => { const el = list.current; if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
          {loading && <p role="status" className="flex items-center justify-center gap-2 p-8 text-muted-foreground"><LoaderCircle size={20} className="animate-spin"/>Loading messages…</p>}{<>
            {hasMore && <div className="text-center"><button onClick={() => void older()} disabled={historyBusy} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium">{historyBusy ? "Loading…" : "Load earlier messages"}</button></div>}
            {!loading && !displayedMessages.length && <div className="mx-auto max-w-sm py-10 text-center"><MessageCircle size={32} className="mx-auto text-orange-500"/><p className="mt-3 font-medium">Start your family conversation</p><p className="mt-2 text-sm text-muted-foreground">Messages are shared with your tutor, student and parent in this room.</p></div>}
            {displayedMessages.map((m, index) => { const previous = displayedMessages[index - 1], newDay = !previous || day(previous.createdAt) !== day(m.createdAt), replyMessage = m.replyPreview || (typeof m.replyTo === "number" ? messages.find(x => x.id === m.replyTo) : m.replyTo); return <div key={m.clientId || m.id} data-chat-message={m.id} data-delivery={m.delivery || "sent"}>
              {newDay && <p className="mb-4 text-center text-xs text-muted-foreground"><span className="rounded-full border border-border bg-white px-3 py-1">{day(m.createdAt)}</span></p>}
              <div className={"flex items-end gap-2 " + (m.isOwn ? "flex-row-reverse" : "")} data-own-message={String(m.isOwn)}>
                <span role="img" aria-label={m.authorName + " profile"} className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-muted-foreground shadow-sm">{m.authorPhoto ? <img src={photoUrl(m.authorPhoto, parentToken)} alt="" className="size-full object-cover"/> : m.authorRole === "admin" ? <GraduationCap size={17}/> : <UserRound size={17}/>}</span>
                <div className={"min-w-0 max-w-[calc(100%_-_3rem)] rounded-2xl border px-3 py-2 shadow-sm sm:max-w-[82%] " + (m.isOwn ? "rounded-br-sm border-orange-200 bg-orange-100/80" : "rounded-bl-sm border-border bg-white")}>
                  <p className="mb-1 text-xs font-semibold text-orange-800">{m.authorName}<span className="ml-2 font-normal capitalize text-muted-foreground">{m.authorRole === "admin" ? "Tutor" : m.authorRole}</span></p>
                  {m.deletedAt ? <p className="py-1 text-sm italic text-muted-foreground">This message was removed.</p> : <>{replyMessage && <div className="mb-2 rounded-lg border-l-2 border-orange-500 bg-white/65 px-3 py-2 text-xs"><p className="font-semibold">{typeof replyMessage === "object" ? replyMessage.authorName || "Reply" : "Reply"}</p><p className="line-clamp-2 break-words">{typeof replyMessage === "object" ? plain(replyMessage.body) || "Attachment" : "Earlier message"}</p></div>}<RichText content={m.body} className="text-sm" parentToken={parentToken}/>{(m.attachments || []).map((f, i) => <div className="mt-2" key={i}><AttachmentCard fileUrl={f.fileUrl} fileName={f.fileName} fileType={f.fileType} parentToken={parentToken}/></div>)}</>}
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[0.7rem] text-muted-foreground">{m.editedAt && !m.deletedAt && <span>Edited</span>}<time dateTime={m.createdAt}>{time(m.createdAt)}</time>{m.delivery ? <span role="status" className={m.delivery==="failed"?"font-medium text-red-700":"inline-flex items-center gap-1"}>{m.delivery==="failed"?"Not confirmed":<><LoaderCircle size={12} className="animate-spin"/>Sending…</>}</span> : m.isOwn && !m.deletedAt && <span title={(m.readBy || []).length ? "Read by " + m.readBy!.map(r => r === "admin" ? "tutor" : r).join(", ") : "Sent"}>{(m.readBy || []).some(r => r !== role) ? <CheckCheck size={15} className="text-blue-600"/> : <Check size={15}/>}</span>}</div>
                  {m.delivery==="failed" && <div className="mt-2 text-sm text-red-700"><p>{m.deliveryError}</p><button className="mt-1 min-h-11 rounded-lg border border-red-200 px-3 font-semibold hover:bg-red-50" onClick={()=>outbox.retry(m.clientId!)}>Retry message</button></div>}
                  {!m.deletedAt && !m.delivery && <div className="mt-1 flex justify-end gap-1"><button title="Reply" aria-label={"Reply to message " + m.id} disabled={locked} onClick={() => { setReply(m); setEditing(null); }} className="rounded-lg p-1.5 hover:bg-black/5"><Reply size={14}/></button>{m.canEdit && <button title="Edit" aria-label={"Edit message " + m.id} disabled={locked} onClick={() => edit(m)} className="rounded-lg p-1.5 hover:bg-black/5"><Pencil size={14}/></button>}{m.canDelete && <button title="Remove" aria-label={"Remove message " + m.id} disabled={locked} onClick={() => setDeleting(m)} className="rounded-lg p-1.5 hover:bg-black/5"><Trash2 size={14}/></button>}</div>}
                </div>
              </div>
            </div>; })}
          </>}
        </div>
        <div className="max-h-[52dvh] shrink-0 overflow-y-auto border-t border-border bg-white p-3 sm:p-4">
          {(reply || editing) && <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border-l-2 border-orange-500 bg-orange-50 px-3 py-2 text-sm"><div className="min-w-0"><p className="font-semibold">{editing ? "Editing your message" : "Replying to " + reply?.authorName}</p><p className="truncate text-muted-foreground">{plain(editing?.body || reply?.body) || "Attachment"}</p></div><button aria-label={editing ? "Cancel editing" : "Cancel reply"} onClick={() => editing ? cancelEdit() : setReply(null)} disabled={locked}><X size={18}/></button></div>}
          <RichTextEditor label="Message" value={body} onChange={value => { setBody(value); requestKey.current = null; }} placeholder="Write a message…" compact uploadRole={role} parentToken={parentToken} disabled={busy || uploading} onBusyChange={setEditorBusy} onUploadErrorChange={setEditorError} className="max-h-48 overflow-y-auto"/>
          {attachments.length > 0 && <ul className="mt-2 space-y-2">{attachments.map((f, i) => <li key={i} className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm"><Paperclip size={16} className="shrink-0"/><span className="min-w-0 flex-1 truncate">{f.fileName}</span><button aria-label={"Remove attachment " + f.fileName} disabled={locked} onClick={() => setAttachments(old => old.filter((_, n) => n !== i))}><X size={16}/></button></li>)}</ul>}
          <div className="mt-3 flex items-center justify-between gap-3"><input ref={input} type="file" multiple accept={SUPPORTED_UPLOAD_ACCEPT} aria-label="Attach files to chat" className="sr-only" disabled={locked} onChange={e => void attach(e.target.files)}/><button type="button" disabled={locked} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium"><Paperclip size={18}/>Attach</button>{uploading && <p role="status" className="text-xs text-muted-foreground">Uploading… {progress}%</p>}<Button onClick={() => void send()} disabled={!outbox.ready || locked || editorError || (!hasRichTextContent(body) && !attachments.length)}><span>{busy ? "Saving…" : editing ? "Save changes" : "Send"}</span>{busy ? <LoaderCircle size={17} className="animate-spin"/> : <Send size={17}/>}</Button></div>
        </div>
      </>}
    </div>
    <Dialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Remove this message?</DialogTitle><DialogDescription>The room will show that the message was removed.</DialogDescription></DialogHeader><div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep message</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? "Removing…" : "Remove message"}</Button></div></DialogContent></Dialog>
  </section>;
}
