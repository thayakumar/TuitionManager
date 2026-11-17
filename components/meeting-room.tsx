"use client";
import { RichTextEditor } from "@/components/rich-text-editor";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
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
    if (leaving) return;
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
  function handleHangup() {
    void handleLeave();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void handleLeave()}
            disabled={leaving}
            title="Back to class"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">
              Meeting with {studentName}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {fmtDateTime(scheduledAt)} · {subject}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span className="text-xs hidden sm:inline">Copy Link</span>
              </>
            )}
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link
              href={`/meeting/${classId}/whiteboard`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open lesson whiteboard in a new tab"
            >
              <PencilRuler size={17} />
              <span className="hidden sm:inline">Whiteboard</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotesOpen(!notesOpen)}
            title={notesOpen ? "Hide notes" : "Show notes"}
          >
            {notesOpen ? (
              <PanelRightClose size={14} />
            ) : (
              <PanelRightOpen size={14} />
            )}
            <span className="text-xs hidden sm:inline">Notes</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleLeave()}
            disabled={leaving}
          >
            <PhoneOff size={14} />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </div>

      {/* Main content: Jitsi + Notes panel */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 bg-gray-900">
          <JitsiMeeting
            roomName={roomName}
            displayName={isAdmin ? "Tutor" : studentName}
            onHangup={handleHangup}
            jwt={jwt}
          />
        </div>

        {notesOpen && (
          <div className="absolute inset-y-14 right-0 z-20 w-[min(90vw,320px)] md:relative md:inset-auto md:z-auto md:w-80 border-l border-border bg-card flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <StickyNote
                  size={14}
                  className={isAdmin ? "text-amber-500" : "text-blue-500"}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAdmin ? "Teacher Notes" : "My Notes"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {saved ? (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <Check size={10} /> Saved
                  </span>
                ) : isPending ? (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Saving...
                  </span>
                ) : (
                  <span className="text-xs text-amber-500">Unsaved</span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleManualSave}
                  disabled={saved || isPending}
                  title="Save notes"
                >
                  <Save size={12} />
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
              value={notes}
              disabled={leaving}
              onChange={handleNotesChange}
              placeholder={
                isAdmin
                  ? "Take notes during the class..."
                  : "Jot down your own notes..."
              }
              className="min-h-0 flex-1 overflow-y-auto p-3"
            />
          </div>
        )}
      </div>
    </div>
  );
}
