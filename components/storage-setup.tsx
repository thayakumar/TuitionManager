"use client";
import { useState } from "react";
import { Copy, Download, CheckCircle2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionBusy } from "@/components/action-busy";
export function StorageSetup() {
  const [script, setScript] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useActionBusy(busy, "Checking file storage…");
  async function prepare() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/storage/setup", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setScript(d.script);
      if (!d.configured)
        setError(
          "The upload connector URL is not configured in Vercel yet. Set APPS_SCRIPT_UPLOAD_URL to your deployed Apps Script web-app URL.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare setup");
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/upload/recent", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(
        "Drive connector v2 is connected. " +
          d.files.length +
          " recent files are available to attach.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to Drive");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-6"
      id="file-storage"
    >
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <FolderOpen size={23} />
        File storage
      </h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Files stay in your Drive folder. Update your existing connector once to
        upload larger files directly to Drive, view private classroom files and
        recover files already uploaded.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => void prepare()}>
          Prepare connector script
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void test()}
        >
          Check connection
        </Button>
      </div>
      {script && (
        <div className="mt-5 space-y-4">
          <ol className="list-decimal space-y-3 pl-6 text-base">
            <li>
              Open your existing{" "}
              <a
                href="https://script.google.com/home"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Apps Script upload project
              </a>
              . Replace its code with the prepared script below.
            </li>
            <li>
              Save. Select <strong>authorizeConnector</strong> in the function
              menu, click Run and approve access to Drive and external requests.
            </li>
            <li>
              Choose{" "}
              <strong>
                Deploy → Manage deployments → Edit → New version → Deploy
              </strong>
              . Keep “Execute as Me” and access “Anyone”. Update the existing
              deployment so its URL stays the same.
            </li>
            <li>
              Return here and click <strong>Check connection</strong>. Existing
              Drive files can then be selected using “Add from Drive” in a post.
            </li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(script)
                  .then(() => setMessage("Connector script copied."))
                  .catch(() =>
                    setError(
                      "Copy was unavailable. Select the script below or download it.",
                    ),
                  )
              }
            >
              <Copy size={17} />
              Copy script
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([script], { type: "text/plain" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "TuitionManager-Drive-Connector.gs";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={17} />
              Download script
            </Button>
          </div>
          <details>
            <summary className="cursor-pointer font-medium">
              Show prepared script
            </summary>
            <textarea
              aria-label="Prepared Drive connector script"
              readOnly
              value={script}
              className="mt-3 h-72 w-full rounded-xl border border-border bg-background p-4 font-mono text-sm"
            />
          </details>
        </div>
      )}
      {message && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-emerald-700"
        >
          <CheckCircle2 size={20} />
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-destructive/5 p-4 text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  );
}
