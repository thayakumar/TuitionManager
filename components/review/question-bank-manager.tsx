"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BankStudioItemView, BankStudioPayload } from "@/lib/review/bank";
import type { Item, ItemKind, Skill } from "@/lib/review/types";

const SKILLS: Array<{ id: Skill; label: string }> = [
  { id: "recall", label: "Recall (Facts & Terms)" },
  { id: "understand", label: "Understand (Classify & Explain)" },
  { id: "apply", label: "Apply (Convert & Calculate)" },
  { id: "trace", label: "Trace (Predict Output)" },
  { id: "debug", label: "Debug (Find & Fix Bug)" },
  { id: "analyse", label: "Analyse (Decompose & Design)" },
];

const KIND_LABELS: Record<ItemKind, string> = {
  mcq: "Multiple Choice (1 correct)",
  multi: "Multi-Select (2+ correct)",
  input: "Typed Answer (Number / Text)",
  order: "Ordering / Parsons Steps",
  match: "Match Pairs",
  sort: "Group Sort (Baskets)",
  bug: "Bug Hunt (Tap Faulty Line)",
  binary: "Bit Flipper (Binary Switches)",
};

function blankItemForKind(kind: ItemKind): Item {
  const base = {
    id: "",
    skill: "apply" as Skill,
    prompt: "",
    code: "",
    explanation: "",
  };
  switch (kind) {
    case "mcq":
      return {
        ...base,
        kind: "mcq",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
        answer: "a",
      };
    case "multi":
      return {
        ...base,
        kind: "multi",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
        answer: ["a", "b"],
      };
    case "input":
      return {
        ...base,
        kind: "input",
        inputMode: "text",
        accept: [""],
        traps: [],
      };
    case "order":
      return {
        ...base,
        kind: "order",
        steps: [
          { id: "s1", text: "" },
          { id: "s2", text: "" },
          { id: "s3", text: "" },
          { id: "s4", text: "" },
        ],
      };
    case "match":
      return {
        ...base,
        kind: "match",
        pairs: [
          { id: "p1", left: "", right: "" },
          { id: "p2", left: "", right: "" },
          { id: "p3", left: "", right: "" },
          { id: "p4", left: "", right: "" },
        ],
      };
    case "sort":
      return {
        ...base,
        kind: "sort",
        buckets: [
          { id: "b1", label: "Group A" },
          { id: "b2", label: "Group B" },
        ],
        cards: [
          { id: "c1", text: "", bucket: "b1" },
          { id: "c2", text: "", bucket: "b1" },
          { id: "c3", text: "", bucket: "b2" },
          { id: "c4", text: "", bucket: "b2" },
        ],
      };
    case "bug":
      return {
        ...base,
        kind: "bug",
        lines: ["", "", "", ""],
        answer: 0,
      };
    case "binary":
      return {
        ...base,
        kind: "binary",
        bits: 4,
        target: 5,
      };
  }
}

export function QuestionBankManager({
  initialBank,
}: {
  initialBank: BankStudioPayload;
}) {
  const [bank, setBank] = useState<BankStudioPayload>(initialBank);
  const [chapterId, setChapterId] = useState<string>(
    initialBank.chapters[0]?.id ?? "",
  );
  const currentChapter =
    bank.chapters.find((c) => c.id === chapterId) ?? bank.chapters[0];
  const [checkpointId, setCheckpointId] = useState<string>(
    currentChapter?.checkpoints[0]?.id ?? "",
  );

  const activeCheckpoint =
    currentChapter?.checkpoints.find((c) => c.id === checkpointId) ??
    currentChapter?.checkpoints[0];

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Item | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshBank() {
    const res = await fetch(`/api/review/bank?form=${bank.form}`, {
      cache: "no-store",
    });
    if (res.ok) {
      setBank((await res.json()) as BankStudioPayload);
    }
  }

  function openNewQuestion() {
    if (!activeCheckpoint) return;
    const defaultKind = activeCheckpoint.game.allowedKinds[0] ?? "mcq";
    setError(null);
    setDraft(blankItemForKind(defaultKind));
    setEditorOpen(true);
  }

  function openEditQuestion(view: BankStudioItemView) {
    setError(null);
    setDraft(structuredClone(view.item));
    setEditorOpen(true);
  }

  async function handleSaveDraft() {
    if (!draft || !activeCheckpoint) return;
    setSaving(true);
    setError(null);
    try {
      const cleaned: Item = structuredClone(draft);
      if (!cleaned.code?.trim()) delete cleaned.code;
      const res = await fetch("/api/review/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          formLevel: bank.form,
          checkpointId: activeCheckpoint.id,
          item: cleaned,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save question.");
      await refreshBank();
      setEditorOpen(false);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!activeCheckpoint) return;
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch("/api/review/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          formLevel: bank.form,
          checkpointId: activeCheckpoint.id,
          itemId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete question.");
      await refreshBank();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete question.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(itemId: string) {
    if (!activeCheckpoint) return;
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch("/api/review/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          formLevel: bank.form,
          checkpointId: activeCheckpoint.id,
          itemId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not restore question.");
      await refreshBank();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore question.");
    } finally {
      setBusyId(null);
    }
  }

  if (!currentChapter || !activeCheckpoint) return null;

  const pdfHref = `/teacher-guides/Form${bank.form}-Bab${currentChapter.number}-Teachers-Guide.pdf`;
  const guideHref = `/review/guide/${bank.form}/${currentChapter.id}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-xs lg:flex-row lg:items-center">
        <div className="space-y-1">
          <Link
            href="/review"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Review Quest Roster
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Question Bank Studio & Teacher&apos;s Guides
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Form {bank.form} • {bank.subject} — Add, edit, or remove questions on any checkpoint, or open the Chapter Teacher&apos;s Guide & PDF.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={guideHref}>
              <BookOpenCheck size={15} /> Live Chapter Guide
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download size={15} /> Bab {currentChapter.number} PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Chapter Tabs */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Chapters">
        {bank.chapters.map((ch) => {
          const selected = ch.id === currentChapter.id;
          const totalQ = ch.checkpoints.reduce((s, c) => s + c.activeCount, 0);
          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setChapterId(ch.id);
                setCheckpointId(ch.checkpoints[0]?.id ?? "");
                setError(null);
              }}
              className={`cursor-pointer rounded-lg border p-3.5 text-left transition-colors duration-150 ${
                selected
                  ? "border-primary bg-secondary/70 shadow-xs"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-primary">
                <span>Bab {ch.number}</span>
                <span className="tabular-nums text-muted-foreground">
                  {ch.checkpoints.length} checkpoints • {totalQ} q
                </span>
              </div>
              <div className="mt-1 text-sm font-bold text-foreground">
                {ch.title}
              </div>
              {ch.titleMs !== ch.title && (
                <div className="truncate text-xs text-muted-foreground">
                  {ch.titleMs}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}

      {/* Main Split: Checkpoint List + Active Checkpoint Question List */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Sub-chapter Checkpoints */}
        <aside className="space-y-2 lg:col-span-4" aria-label="Checkpoints in chapter">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Bab {currentChapter.number} Checkpoints
          </div>
          <div className="space-y-1.5">
            {currentChapter.checkpoints.map((cp) => {
              const selected = cp.id === activeCheckpoint.id;
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => {
                    setCheckpointId(cp.id);
                    setError(null);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-xs transition-colors duration-150 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground font-semibold"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-mono font-bold">
                      {cp.boss ? `BOSS ${cp.code}` : cp.code}
                    </span>{" "}
                    — <span className="truncate">{cp.title}</span>
                    <span
                      className={`block text-[11px] ${
                        selected ? "text-primary-foreground/85" : "text-muted-foreground"
                      }`}
                    >
                      {cp.game.name} • draws {cp.draw}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-secondary text-primary"
                    }`}
                  >
                    {cp.activeCount}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Workspace: Standard + Question Cards */}
        <section className="space-y-4 lg:col-span-8">
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    {activeCheckpoint.boss
                      ? `BOSS ${activeCheckpoint.code}`
                      : activeCheckpoint.code}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
                    Game: {activeCheckpoint.game.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Pool: {activeCheckpoint.activeCount} active (draws {activeCheckpoint.draw}/round)
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-foreground">
                  {activeCheckpoint.title}
                </h2>
                {activeCheckpoint.titleMs !== activeCheckpoint.title && (
                  <p className="text-xs text-muted-foreground">
                    {activeCheckpoint.titleMs}
                  </p>
                )}
              </div>

              <Button type="button" size="sm" onClick={openNewQuestion} className="gap-1.5">
                <Plus size={15} aria-hidden="true" />
                Add Question
              </Button>
            </div>

            <div className="mt-4 grid gap-3 rounded-md border border-border/80 bg-muted/30 p-3.5 text-xs sm:grid-cols-2">
              <div>
                <div className="font-bold uppercase tracking-wider text-primary">
                  KSSM Standard Pembelajaran
                </div>
                <p className="mt-1 font-medium text-foreground">
                  {activeCheckpoint.standard.standardPembelajaranMs}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {activeCheckpoint.standard.standardPembelajaranEn}
                </p>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wider text-primary">
                  What We Are Measuring & Why This Game
                </div>
                <p className="mt-1 text-foreground">
                  {activeCheckpoint.standard.measuring}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <strong>Research rationale:</strong> {activeCheckpoint.game.evidence}
                </p>
              </div>
            </div>
          </div>

          {/* Question Cards */}
          <div className="space-y-3">
            {activeCheckpoint.items.map((v, idx) => {
              const isDeleted = v.source === "deleted";
              return (
                <article
                  key={v.id}
                  className={`rounded-lg border p-4 text-xs shadow-2xs ${
                    isDeleted
                      ? "border-dashed border-stone-300 bg-stone-100/70 opacity-75"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-semibold uppercase text-primary">
                        {v.item.kind}
                      </span>
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 capitalize text-foreground">
                        Skill: {v.item.skill}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          v.source === "custom"
                            ? "bg-emerald-100 text-emerald-900"
                            : v.source === "edited"
                              ? "bg-amber-100 text-amber-900"
                              : v.source === "deleted"
                                ? "bg-red-100 text-red-900"
                                : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {v.source === "custom"
                          ? "Custom"
                          : v.source === "edited"
                            ? "Edited"
                            : v.source === "deleted"
                              ? "Hidden"
                              : "Textbook Bank"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {!isDeleted && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditQuestion(v)}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <Edit3 size={12} aria-hidden="true" />
                          Edit
                        </Button>
                      )}
                      {v.canRestoreBuiltin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === v.id}
                          onClick={() => handleRestore(v.id)}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <RotateCcw size={12} aria-hidden="true" />
                          Restore Default
                        </Button>
                      )}
                      {!isDeleted && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === v.id}
                          onClick={() => handleDelete(v.id)}
                          className="h-7 gap-1 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          {busyId === v.id ? (
                            <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 size={12} aria-hidden="true" />
                          )}
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="mt-2.5 whitespace-pre-line text-sm font-semibold leading-relaxed text-foreground">
                    {v.item.prompt}
                  </p>

                  {v.item.code && (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-stone-900 p-2.5 font-mono text-[11px] text-amber-100">
                      <code>{v.item.code}</code>
                    </pre>
                  )}

                  {(v.item.kind === "mcq" || v.item.kind === "multi") && (() => {
                    const ansSet = new Set(
                      v.item.kind === "mcq" ? [v.item.answer] : v.item.answer,
                    );
                    return (
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                        {v.item.options.map((o, oi) => {
                          const isAns = ansSet.has(o.id);
                          return (
                            <li
                              key={o.id}
                              className={`rounded-sm border px-2.5 py-1.5 ${
                                isAns
                                  ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-950"
                                  : "border-border/70 bg-background text-muted-foreground"
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}) {o.text}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}

                  <div className="mt-3 space-y-1 border-t border-border/70 pt-2.5">
                    <div>
                      <strong className="text-emerald-800">Answer Key: </strong>
                      <span className="font-mono text-foreground">{v.answerKey}</span>
                    </div>
                    <div>
                      <strong className="text-foreground">Explanation: </strong>
                      <span className="text-muted-foreground">{v.item.explanation}</span>
                    </div>
                    {v.traps.length > 0 && (
                      <div className="text-amber-900">
                        <strong>Diagnostic Traps: </strong>
                        {v.traps.map((t) => `${t.trigger} → ${t.meaning}`).join(" • ")}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add / Edit Question Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Edit Question" : `Add Question to ${activeCheckpoint.code}`}
            </DialogTitle>
            <DialogDescription>
              Game mode <strong>{activeCheckpoint.game.name}</strong> supports:{" "}
              {activeCheckpoint.game.allowedKinds.map((k) => KIND_LABELS[k]).join(", ")}.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="qb-kind" className="mb-1 block text-xs font-bold">
                    Question Format
                  </label>
                  <select
                    id="qb-kind"
                    value={draft.kind}
                    disabled={!!draft.id}
                    onChange={(e) => {
                      const nextKind = e.target.value as ItemKind;
                      const fresh = blankItemForKind(nextKind);
                      fresh.prompt = draft.prompt;
                      fresh.code = draft.code;
                      fresh.explanation = draft.explanation;
                      fresh.skill = draft.skill;
                      setDraft(fresh);
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                  >
                    {activeCheckpoint.game.allowedKinds.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="qb-skill" className="mb-1 block text-xs font-bold">
                    Cognitive Skill Measured
                  </label>
                  <select
                    id="qb-skill"
                    value={draft.skill}
                    onChange={(e) =>
                      setDraft({ ...draft, skill: e.target.value as Skill })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                  >
                    {SKILLS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="qb-prompt" className="mb-1 block text-xs font-bold">
                  Question Prompt
                </label>
                <textarea
                  id="qb-prompt"
                  rows={3}
                  value={draft.prompt}
                  onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                  placeholder="Write a clear question for your students…"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="qb-code" className="mb-1 block text-xs font-bold">
                  Optional Code / Pseudocode / HTML Block
                </label>
                <textarea
                  id="qb-code"
                  rows={3}
                  value={draft.code ?? ""}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  placeholder="Leave blank if not needed…"
                  className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs"
                />
              </div>

              {/* Type-Specific Answer Editors */}
              {draft.kind === "mcq" && (
                <div className="space-y-2">
                  <div className="text-xs font-bold">
                    Options (select the radio button next to the correct answer)
                  </div>
                  {draft.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcq-correct"
                        aria-label={`Mark option ${idx + 1} as correct`}
                        checked={draft.answer === opt.id}
                        onChange={() => setDraft({ ...draft, answer: opt.id })}
                      />
                      <input
                        type="text"
                        aria-label={`Option ${idx + 1} text`}
                        value={opt.text}
                        onChange={(e) => {
                          const options = draft.options.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o,
                          );
                          setDraft({ ...draft, options });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {draft.kind === "multi" && (
                <div className="space-y-2">
                  <div className="text-xs font-bold">
                    Options (tick ALL correct options)
                  </div>
                  {draft.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Toggle option ${idx + 1} correct`}
                        checked={draft.answer.includes(opt.id)}
                        onChange={(e) => {
                          const answer = e.target.checked
                            ? [...draft.answer, opt.id]
                            : draft.answer.filter((x) => x !== opt.id);
                          setDraft({ ...draft, answer });
                        }}
                      />
                      <input
                        type="text"
                        aria-label={`Option ${idx + 1} text`}
                        value={opt.text}
                        onChange={(e) => {
                          const options = draft.options.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o,
                          );
                          setDraft({ ...draft, options });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {draft.kind === "input" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="qb-accept" className="mb-1 block text-xs font-bold">
                      Accepted Answers (comma-separated)
                    </label>
                    <input
                      id="qb-accept"
                      type="text"
                      value={draft.accept.join(", ")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          accept: e.target.value.split(",").map((s) => s.trim()),
                        })
                      }
                      placeholder="e.g. 1011, 00001011"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="qb-imode" className="mb-1 block text-xs font-bold">
                      Input Mode
                    </label>
                    <select
                      id="qb-imode"
                      value={draft.inputMode ?? "text"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          inputMode: e.target.value as "numeric" | "text",
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="numeric">Numeric</option>
                    </select>
                  </div>
                </div>
              )}

              {draft.kind === "order" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Steps in CORRECT Order (students see them shuffled)
                    </span>
                    {draft.steps.length < 8 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            steps: [
                              ...draft.steps,
                              { id: `s${draft.steps.length + 1}`, text: "" },
                            ],
                          })
                        }
                        className="h-7 text-xs"
                      >
                        + Add Step
                      </Button>
                    )}
                  </div>
                  {draft.steps.map((st, idx) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="w-5 font-mono text-xs font-bold">{idx + 1}.</span>
                      <input
                        type="text"
                        aria-label={`Step ${idx + 1}`}
                        value={st.text}
                        onChange={(e) => {
                          const steps = draft.steps.map((s, i) =>
                            i === idx ? { ...s, text: e.target.value } : s,
                          );
                          setDraft({ ...draft, steps });
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {draft.kind === "match" && (
                <div className="space-y-2">
                  <div className="text-xs font-bold">Matching Pairs (Left ↔ Right)</div>
                  {draft.pairs.map((p, idx) => (
                    <div key={p.id} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        aria-label={`Pair ${idx + 1} left`}
                        value={p.left}
                        onChange={(e) => {
                          const pairs = draft.pairs.map((x, i) =>
                            i === idx ? { ...x, left: e.target.value } : x,
                          );
                          setDraft({ ...draft, pairs });
                        }}
                        placeholder="Left term"
                        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        aria-label={`Pair ${idx + 1} right`}
                        value={p.right}
                        onChange={(e) => {
                          const pairs = draft.pairs.map((x, i) =>
                            i === idx ? { ...x, right: e.target.value } : x,
                          );
                          setDraft({ ...draft, pairs });
                        }}
                        placeholder="Matching meaning"
                        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {draft.kind === "sort" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {draft.buckets.map((b, bi) => (
                      <div key={b.id}>
                        <label
                          htmlFor={`bucket-${b.id}`}
                          className="mb-1 block text-xs font-bold"
                        >
                          Basket {bi + 1} Name
                        </label>
                        <input
                          id={`bucket-${b.id}`}
                          type="text"
                          value={b.label}
                          onChange={(e) => {
                            const buckets = draft.buckets.map((x, i) =>
                              i === bi ? { ...x, label: e.target.value } : x,
                            );
                            setDraft({ ...draft, buckets });
                          }}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold">Cards & Correct Basket</div>
                    {draft.cards.map((c, ci) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label={`Card ${ci + 1} text`}
                          value={c.text}
                          onChange={(e) => {
                            const cards = draft.cards.map((x, i) =>
                              i === ci ? { ...x, text: e.target.value } : x,
                            );
                            setDraft({ ...draft, cards });
                          }}
                          placeholder={`Card ${ci + 1}`}
                          className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                        />
                        <select
                          aria-label={`Card ${ci + 1} basket`}
                          value={c.bucket}
                          onChange={(e) => {
                            const cards = draft.cards.map((x, i) =>
                              i === ci ? { ...x, bucket: e.target.value } : x,
                            );
                            setDraft({ ...draft, cards });
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {draft.buckets.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draft.kind === "bug" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Code Lines (select radio next to the BUGGY line)
                    </span>
                    {draft.lines.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft({ ...draft, lines: [...draft.lines, ""] })
                        }
                        className="h-7 text-xs"
                      >
                        + Add Line
                      </Button>
                    )}
                  </div>
                  {draft.lines.map((ln, li) => (
                    <div key={li} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bug-line"
                        aria-label={`Mark line ${li + 1} as buggy`}
                        checked={draft.answer === li}
                        onChange={() => setDraft({ ...draft, answer: li })}
                      />
                      <span className="w-5 font-mono text-xs text-muted-foreground">
                        {li + 1}
                      </span>
                      <input
                        type="text"
                        aria-label={`Line ${li + 1} code`}
                        value={ln}
                        onChange={(e) => {
                          const lines = draft.lines.map((x, i) =>
                            i === li ? e.target.value : x,
                          );
                          setDraft({ ...draft, lines });
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {draft.kind === "binary" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="qb-bits" className="mb-1 block text-xs font-bold">
                      Number of Bits (3–8)
                    </label>
                    <input
                      id="qb-bits"
                      type="number"
                      min={3}
                      max={8}
                      value={draft.bits}
                      onChange={(e) =>
                        setDraft({ ...draft, bits: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="qb-target" className="mb-1 block text-xs font-bold">
                      Target Decimal Value (0 – {2 ** draft.bits - 1})
                    </label>
                    <input
                      id="qb-target"
                      type="number"
                      min={0}
                      max={2 ** draft.bits - 1}
                      value={draft.target}
                      onChange={(e) =>
                        setDraft({ ...draft, target: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="qb-exp" className="mb-1 block text-xs font-bold">
                  Teaching Explanation (shown after answering)
                </label>
                <textarea
                  id="qb-exp"
                  rows={2}
                  value={draft.explanation}
                  onChange={(e) =>
                    setDraft({ ...draft, explanation: e.target.value })
                  }
                  placeholder="Explain clearly why the answer is right…"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 p-2.5 text-xs text-red-900">
                  {error}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={handleSaveDraft} className="gap-1.5">
              {saving ? (
                <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={14} aria-hidden="true" />
              )}
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
