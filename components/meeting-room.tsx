"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, Check, PhoneOff, PanelRightClose,
  PanelRightOpen, Save, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JitsiMeeting } from "@/components/jitsi-meeting";
import { saveClassNotes } from "@/lib/actions";
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
}: {
  classId: number;
  roomName: string;
  studentName: string;
  studentId: number;
  scheduledAt: string;
  subject: string;
  initialNotes: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [notesOpen, setNotesOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetingUrl = `https://meet.jit.si/${roomName}`;
  const scope = isAdmin ? "teacher" : "student";

  const doSave = useCallback(
    (text: string) => {
      startTransition(async () => {
        await saveClassNotes(classId, scope, text);
        setSaved(true);
      });
    },
    [classId, scope, startTransition]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(value), 2000);
  }

  function handleManualSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(notes);
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  function handleLeave() {
    if (!saved) doSave(notes);
    if (isAdmin) {
      router.push(`/classes/${classId}?report=true`);
    } else {
      router.push(`/portal/student/${studentId}`);
    }
  }

  function handleHangup() {
    if (!saved) doSave(notes);
    if (isAdmin) {
      router.push(`/classes/${classId}?report=true`);
    } else {
      router.push(`/portal/student/${studentId}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={handleLeave} title="Back to class">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotesOpen(!notesOpen)}
            title={notesOpen ? "Hide notes" : "Show notes"}
          >
            {notesOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span className="text-xs hidden sm:inline">Notes</span>
          </Button>

          <Button variant="destructive" size="sm" onClick={handleLeave}>
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
          />
        </div>

        {notesOpen && (
          <div className="w-72 sm:w-80 border-l border-border bg-card flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <StickyNote size={14} className={isAdmin ? "text-amber-500" : "text-blue-500"} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAdmin ? "Teacher Notes" : "My Notes"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {saved ? (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <Check size={10} /> Saved
                  </span>
                ) : isPending ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Saving...
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-500">Unsaved</span>
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
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={isAdmin ? "Take notes during the class..." : "Jot down your own notes..."}
              className="flex-1 w-full resize-none border-0 bg-transparent px-3 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
