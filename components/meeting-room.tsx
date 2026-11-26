"use client";
import { RichTextEditor } from "@/components/rich-text-editor";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandHomeLink } from "@/components/brand-home-link";
import {
  Copy,
  Check,
  Files,
  PhoneOff,
  PanelRightClose,
  PanelRightOpen,
  Save,
  StickyNote,
  PencilRuler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JitsiMeeting } from "@/components/jitsi-meeting";
import { NoteSaveQueue } from "@/components/note-save-queue";
import { saveClassNotes } from "@/lib/actions";
import { actionError } from "@/lib/action-errors";
import { fmtDateTime } from "@/lib/format";

export function MeetingRoom({
  classId,
  roomName,
  studentName,
  studentId,
  scheduledAt,
  subject,
  initialNotes,
  isAdmin = true,
  jwt,
  jaasAppId,
}: {
  classId: number;
  roomName: string;
  studentName: string;
  studentId: number;
  scheduledAt: string;
  subject: string;
  initialNotes: string;
  isAdmin?: boolean;
  jwt?: string;
  jaasAppId?: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [notesOpen, setNotesOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isPending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestText = useRef(initialNotes);
  const scope = isAdmin ? "teacher" : "student";
  const draftKey = `tuition-note:${scope}:${classId}:${isAdmin ? "admin" : studentId}`;
  const queue = useRef<NoteSaveQueue | null>(null);
  if (!queue.current)
    queue.current = new NoteSaveQueue(initialNotes, (value) =>
      saveClassNotes(classId, scope, value),
    );

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setNotesOpen(false);
    }
  }, []);

  const flush = useCallback(async () => {
    setPending(true);
    setSaveError(null);
    try {
      await queue.current!.flush((current) => {
        setSaved(current);
        if (current) {
          try {
            sessionStorage.removeItem(draftKey);
          } catch {}
        }
      });
    } catch (e) {
      setSaved(false);
      setSaveError(
        actionError(
          e,
          "Could not save your notes. Your draft is kept; try Save again.",
        ),
      );
      throw e;
    } finally {
      setPending(false);
    }
  }, [classId, scope, draftKey]);

  function handleNotesChange(value: string) {
    latestText.current = value;
    queue.current!.update(value);
    setNotes(value);
    setSaved(!queue.current!.dirty);
    try {
      sessionStorage.setItem(draftKey, value);
    } catch {}
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flush().catch(() => {});
    }, 2000);
  }
  function handleManualSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flush().catch(() => {});
  }
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(draftKey);
      if (draft !== null && draft !== initialNotes) {
        latestText.current = draft;
        queue.current!.update(draft);
        setNotes(draft);
        setSaved(false);
        setSaveError(
          "Recovered unsaved notes. Choose Save to keep this draft.",
        );
      }
    } catch {}
    const warn = (event: BeforeUnloadEvent) => {
      if (queue.current?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      window.removeEventListener("beforeunload", warn);
    };
  }, [draftKey, initialNotes]);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/meeting/${classId}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveError(
        "Could not copy the meeting link. You can copy this page's address instead.",
      );
    }
  }
  async function handleLeave() {
    if (leaving || imageUploading || imageUploadError) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setLeaving(true);
    try {
      await flush();
      router.push(
        isAdmin
          ? `/classes/${classId}?report=true`
          : `/portal/student/${studentId}/schedule`,
      );
    } catch {
      setLeaving(false);
    }
  }
  async function goHome() {
    if (leaving || imageUploading || imageUploadError) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setLeaving(true);
    try {
      await flush();
      router.push(isAdmin ? "/dashboard" : "/portal/student/" + studentId);
    } catch {
      setLeaving(false);
    }
  }
  function handleHangup() {
    void handleLeave();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 shrink-0">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
          <BrandHomeLink
            href={isAdmin ? "/dashboard" : "/portal/student/" + studentId}
            compact
            onNavigate={goHome}
            disabled={leaving || imageUploading || imageUploadError}
          />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">
              Meeting with {studentName}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {fmtDateTime(scheduledAt)} · {subject}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={copied ? "Meeting link copied" : "Copy meeting link"}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check size={15} className="text-emerald-700" aria-hidden="true" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={15} aria-hidden="true" />
                <span className="text-xs hidden sm:inline">Copy link</span>
              </>
            )}
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link
              href={`/meeting/${classId}/documents`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open lesson documents in a new tab"
            >
              <Files size={15} aria-hidden="true" />
              <span className="text-xs hidden sm:inline">Documents</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/meeting/${classId}/whiteboard`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open lesson whiteboard in a new tab"
            >
              <PencilRuler size={15} aria-hidden="true" />
              <span className="text-xs hidden sm:inline">Whiteboard</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNotesOpen(!notesOpen)}
            aria-pressed={notesOpen}
            aria-label={notesOpen ? "Hide notes panel" : "Show notes panel"}
            title={notesOpen ? "Hide notes" : "Show notes"}
          >
            {notesOpen ? (
              <PanelRightClose size={15} aria-hidden="true" />
            ) : (
              <PanelRightOpen size={15} aria-hidden="true" />
            )}
            <span className="text-xs hidden sm:inline">Notes</span>
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void handleLeave()}
            disabled={leaving || imageUploading || imageUploadError}
            aria-label="Leave meeting"
          >
            <PhoneOff size={15} aria-hidden="true" />
            <span className="text-xs hidden sm:inline">Leave</span>
          </Button>
        </div>
      </header>

      {/* Main content: Jitsi + Notes panel */}
      <main className="relative flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 bg-slate-900">
          <JitsiMeeting
            roomName={roomName}
            displayName={isAdmin ? "Tutor" : studentName}
            onHangup={handleHangup}
            jwt={jwt}
          />
        </div>

        {notesOpen && (
          <aside
            aria-label={isAdmin ? "Teacher notes" : "My notes"}
            className="absolute inset-y-0 right-0 z-20 w-[min(90vw,320px)] md:relative md:inset-auto md:z-auto md:w-80 border-l border-border bg-card flex flex-col shrink-0 shadow-xl md:shadow-none"
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <StickyNote
                  size={14}
                  className={isAdmin ? "text-amber-700" : "text-primary"}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAdmin ? "Teacher notes" : "My notes"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {saved ? (
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <Check size={12} aria-hidden="true" /> Saved
                  </span>
                ) : isPending ? (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Saving…
                  </span>
                ) : (
                  <span className="text-xs text-amber-700">Unsaved</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleManualSave}
                  disabled={saved || isPending}
                  aria-label="Save notes"
                  title="Save notes"
                >
                  <Save size={14} aria-hidden="true" />
                </Button>
              </div>
            </div>
            {saveError && (
              <p
                role="alert"
                className="m-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive"
              >
                {saveError}
              </p>
            )}
            <RichTextEditor
              label="Meeting notes"
              uploadRole={isAdmin ? "admin" : "student"}
              onBusyChange={setImageUploading}
              onUploadErrorChange={setImageUploadError}
              value={notes}
              disabled={leaving || imageUploading}
              onChange={handleNotesChange}
              placeholder={
                isAdmin
                  ? "Take notes during the class..."
                  : "Jot down your own notes..."
              }
              className="min-h-0 flex-1 overflow-y-auto p-3"
            />
          </aside>
        )}
      </main>
    </div>
  );
}
