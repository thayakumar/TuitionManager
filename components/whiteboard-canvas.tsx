"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
type Workspace = Record<string, unknown>;
type Board = {
  data: Workspace | null;
  revision: number;
  updatedAt: string | null;
};
type Draft = { data: Workspace; revision: number };
export function WhiteboardCanvas({
  boardId,
  identity,
}: {
  boardId: string;
  identity: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Loading whiteboard…"),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [ready, setReady] = useState(false);
  const controls = useRef<{
    retry: () => void;
    loadSaved: () => void;
    saveMine: () => void;
    download: () => void;
  }>({ retry() {}, loadSaved() {}, saveMine() {}, download() {} });
  useEffect(() => {
    let alive = true,
      frameReady = false,
      initial: Board | null = null,
      local: Workspace | null = null,
      revision = 0,
      dirty = false,
      saving = false,
      blocked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const key = "tuition-whiteboard:" + identity + ":" + boardId;
    const endpoint = "/api/whiteboards/" + encodeURIComponent(boardId);
    setReady(false);
    setConflict(false);
    setError("");
    setStatus("Loading whiteboard…");
    function storeDraft() {
      if (local)
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({ data: local, revision }),
          );
        } catch {
          /* Server saves remain available when browser storage is disabled. */
        }
    }
    function clearDraft() {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    }
    async function get(): Promise<Board>;
    async function get(conditional: true): Promise<Board | null>;
    async function get(conditional = false): Promise<Board | null> {
      const response = await fetch(endpoint, {
        cache: "no-store",
        ...(conditional
          ? { headers: { "If-None-Match": '"whiteboard-' + revision + '"' } }
          : {}),
      });
      if (response.status === 304) return null;
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not open the whiteboard.");
      return data;
    }
    function load(data: Workspace | null) {
      frame.current?.contentWindow?.postMessage(
        { type: "tuition-whiteboard-load", data },
        location.origin,
      );
    }
    function initialize() {
      if (!frameReady || !initial) return;
      revision = initial.revision;
      local = initial.data;
      let draft: Draft | null = null;
      try {
        draft = JSON.parse(sessionStorage.getItem(key) || "null");
      } catch {}
      if (draft?.data && typeof draft.data === "object") {
        local = draft.data;
        dirty = true;
        if (draft.revision !== revision) {
          blocked = true;
          setConflict(true);
          setStatus("A recovered draft differs from the saved board.");
        } else {
          setStatus("Recovered unsaved changes");
          timer = setTimeout(() => void save(), 800);
        }
      }
      load(local);
    }
    async function save() {
      if (!alive || !dirty || saving || blocked || !local) return;
      saving = true;
      setStatus("Saving…");
      setError("");
      const snapshot = local;
      try {
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: snapshot, revision }),
        });
        const result = await response.json();
        if (!alive) return;
        if (response.status === 409) {
          blocked = true;
          setConflict(true);
          storeDraft();
          setStatus("Another person updated this board.");
          return;
        }
        if (!response.ok)
          throw new Error(result.error || "Could not save your whiteboard.");
        revision = result.revision;
        if (local === snapshot) {
          dirty = false;
          clearDraft();
          setStatus("Saved");
        } else {
          storeDraft();
          setStatus("Saving latest changes…");
          timer = setTimeout(() => void save(), 200);
        }
      } catch (reason) {
        if (alive) {
          storeDraft();
          setError(
            reason instanceof Error ? reason.message : "Could not save.",
          );
          setStatus("Not saved — your draft is kept in this tab.");
        }
      } finally {
        saving = false;
      }
    }
    function schedule(data: Workspace) {
      local = data;
      dirty = true;
      storeDraft();
      if (blocked) return;
      setStatus("Unsaved changes");
      clearTimeout(timer);
      timer = setTimeout(() => void save(), 800);
    }
    function message(event: MessageEvent) {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data?.type === "tuition-whiteboard-ready") {
        frameReady = true;
        initialize();
      }
      if (event.data?.type === "tuition-whiteboard-loaded") {
        setReady(true);
        if (!dirty && !blocked) setStatus("Saved");
      }
      if (event.data?.type === "tuition-whiteboard-error")
        setError(
          "The saved whiteboard could not be opened. Download your draft before reloading.",
        );
      if (
        event.data?.type === "tuition-whiteboard-change" &&
        initial &&
        event.data.data &&
        typeof event.data.data === "object"
      )
        schedule(event.data.data);
    }
    window.addEventListener("message", message);
    void get()
      .then((board) => {
        if (alive) {
          initial = board;
          initialize();
        }
      })
      .catch((reason) => {
        if (alive) {
          setStatus("Whiteboard unavailable");
          setError(reason.message);
        }
      });
    const poll = setInterval(() => {
      if (!frameReady) {
        frame.current?.contentWindow?.postMessage(
          { type: "tuition-whiteboard-handshake" },
          location.origin,
        );
        return;
      }
      if (!initial || dirty || saving || blocked) return;
      void get(true)
        .then((board) => {
          if (
            board &&
            alive &&
            !dirty &&
            !saving &&
            !blocked &&
            board.revision !== revision
          ) {
            revision = board.revision;
            local = board.data;
            initial = board;
            load(board.data);
            setStatus("Updated from saved board");
          }
        })
        .catch(() => {
          /* Keep the board usable; save errors provide retry feedback. */
        });
    }, 5000);
    function warn(event: BeforeUnloadEvent) {
      if (dirty || saving) {
        storeDraft();
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    controls.current = {
      retry: () => {
        if (initial) void save();
        else
          void get()
            .then((board) => {
              initial = board;
              setError("");
              initialize();
            })
            .catch((reason) => setError(reason.message));
      },
      loadSaved: () => {
        void get()
          .then((board) => {
            if (!alive) return;
            revision = board.revision;
            initial = board;
            local = board.data;
            dirty = false;
            blocked = false;
            setConflict(false);
            setError("");
            clearDraft();
            load(board.data);
            setStatus("Saved version loaded");
          })
          .catch((reason) => setError(reason.message));
      },
      saveMine: () => {
        void get()
          .then((board) => {
            if (!alive) return;
            revision = board.revision;
            blocked = false;
            setConflict(false);
            dirty = true;
            storeDraft();
            void save();
          })
          .catch((reason) => setError(reason.message));
      },
      download: () => {
        if (!local) return;
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(local, null, 2)], {
            type: "application/json",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = boardId + ".excaliflow";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    };
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("message", message);
      window.removeEventListener("beforeunload", warn);
      if (dirty) storeDraft();
    };
  }, [boardId, identity]);
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <p role="status" className="text-sm font-medium">
          {status}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => controls.current.download()}
          disabled={!ready}
        >
          <Download size={16} /> Download my copy
        </Button>
      </div>
      {conflict && (
        <div
          role="alert"
          className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-orange-950"
        >
          <p className="font-semibold">There are two versions of this board.</p>
          <p className="mt-2 text-sm">
            Your changes are kept in this tab. Download your copy before
            choosing which version to save. Saving your version replaces the
            current saved version.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => controls.current.loadSaved()}
            >
              <RefreshCw size={16} /> Load saved version
            </Button>
            <Button type="button" onClick={() => controls.current.saveMine()}>
              <Save size={16} /> Save my version
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="min-w-0 flex-1 break-words text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => controls.current.retry()}
          >
            Retry
          </Button>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white">
        {!ready && (
          <p className="absolute inset-0 z-10 grid place-items-center bg-white text-muted-foreground">
            Loading drawing tools…
          </p>
        )}
        <iframe
          ref={frame}
          src="/vendor/excaliflow/index.html"
          title="Excaliflow whiteboard"
          onLoad={() =>
            frame.current?.contentWindow?.postMessage(
              { type: "tuition-whiteboard-handshake" },
              location.origin,
            )
          }
          sandbox="allow-scripts allow-same-origin allow-downloads"
          allow="clipboard-write"
          className="block h-[78dvh] min-h-[560px] w-full border-0"
          style={{ visibility: ready ? "visible" : "hidden" }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Powered by{" "}
        <a
          className="underline"
          href="https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/advanced_llm_apps/excaliflow"
          target="_blank"
          rel="noopener noreferrer"
        >
          Excaliflow
        </a>
        . Saved changes from the other person appear within a few seconds.
        Simultaneous edits require choosing a version.
      </p>
    </section>
  );
}
