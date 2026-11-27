"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Bug,
  CheckCircle2,
  HelpCircle,
  LoaderCircle,
  Lock,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ActiveSessionPayload,
  SubmitAnswerResult,
} from "@/lib/review/service";
import type {
  ClientItem,
  Confidence,
  GradeResult,
  ItemResponse,
} from "@/lib/review/types";

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function StarsRow({ stars, size = 22 }: { stars: 0 | 1 | 2 | 3; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${stars} out of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={size}
          className={
            n <= stars
              ? "fill-amber-400 text-amber-500"
              : "fill-stone-200 text-stone-300"
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function GamePlayer({
  studentId,
  session: initialSession,
  onExitToTrail,
  onStartCheckpoint,
}: {
  studentId: number;
  session: ActiveSessionPayload;
  onExitToTrail: () => void;
  onStartCheckpoint: (checkpointId: string, forceRestart?: boolean) => Promise<void>;
}) {
  const [session, setSession] = useState<ActiveSessionPayload>(initialSession);
  const firstUnansweredIdx = initialSession.items.findIndex(
    (it) => !(it.id in initialSession.answered),
  );
  const [index, setIndex] = useState<number>(
    firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0,
  );
  const [summary, setSummary] = useState<ActiveSessionPayload["summary"]>(
    initialSession.summary,
  );
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-item draft state
  const [mcqChoice, setMcqChoice] = useState<string>("");
  const [multiChoices, setMultiChoices] = useState<string[]>([]);
  const [orderList, setOrderList] = useState<string[]>([]);
  const [swapPick, setSwapPick] = useState<number | null>(null);
  const [matchLeft, setMatchLeft] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});
  const [sortPick, setSortPick] = useState<string | null>(null);
  const [sortPlacement, setSortPlacement] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState<string>("");
  const [bugLine, setBugLine] = useState<number | null>(null);
  const [bitsValue, setBitsValue] = useState<string>("");

  const itemStartRef = useRef<number>(Date.now());

  useEffect(() => {
    setSession(initialSession);
    setSummary(initialSession.summary);
    const nextIdx = initialSession.items.findIndex(
      (it) => !(it.id in initialSession.answered),
    );
    setIndex(nextIdx >= 0 ? nextIdx : 0);
  }, [initialSession]);

  const currentItem: ClientItem | undefined = session.items[index];
  const savedAnswer = currentItem ? session.answered[currentItem.id] : undefined;

  // Reset draft controls when currentItem changes
  useEffect(() => {
    if (!currentItem) return;
    itemStartRef.current = Date.now();
    setError(null);
    setSwapPick(null);
    setMatchLeft(null);
    setSortPick(null);

    const prev = session.answered[currentItem.id]?.response;
    switch (currentItem.kind) {
      case "mcq":
        setMcqChoice(prev?.kind === "mcq" ? prev.choice : "");
        break;
      case "multi":
        setMultiChoices(prev?.kind === "multi" ? prev.choices : []);
        break;
      case "order":
        setOrderList(
          prev?.kind === "order"
            ? prev.order
            : currentItem.steps.map((s) => s.id),
        );
        break;
      case "match":
        setMatchPairs(prev?.kind === "match" ? prev.pairs : {});
        break;
      case "sort":
        setSortPlacement(prev?.kind === "sort" ? prev.placement : {});
        break;
      case "input":
        setInputValue(prev?.kind === "input" ? prev.value : "");
        break;
      case "bug":
        setBugLine(prev?.kind === "bug" ? prev.line : null);
        break;
      case "binary":
        setBitsValue(
          prev?.kind === "binary"
            ? prev.value
            : "0".repeat(currentItem.bits),
        );
        break;
    }
  }, [currentItem?.id, session.attemptId]);

  function buildResponse(item: ClientItem): ItemResponse | null {
    switch (item.kind) {
      case "mcq":
        return mcqChoice ? { kind: "mcq", choice: mcqChoice } : null;
      case "multi":
        return multiChoices.length > 0
          ? { kind: "multi", choices: multiChoices }
          : null;
      case "order":
        return orderList.length === item.steps.length
          ? { kind: "order", order: orderList }
          : null;
      case "match":
        return Object.keys(matchPairs).length === item.left.length
          ? { kind: "match", pairs: matchPairs }
          : null;
      case "sort":
        return Object.keys(sortPlacement).length === item.cards.length
          ? { kind: "sort", placement: sortPlacement }
          : null;
      case "input":
        return inputValue.trim().length > 0
          ? { kind: "input", value: inputValue }
          : null;
      case "bug":
        return bugLine !== null ? { kind: "bug", line: bugLine } : null;
      case "binary":
        return bitsValue.length === item.bits
          ? { kind: "binary", value: bitsValue }
          : null;
    }
  }

  const readyToSubmit = currentItem ? buildResponse(currentItem) !== null : false;

  async function handleCheck(confidence: Confidence) {
    if (!currentItem || savedAnswer || submitting) return;
    const response = buildResponse(currentItem);
    if (!response) {
      setError("Complete your answer above before checking.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const elapsed = Math.max(500, Date.now() - itemStartRef.current);
    try {
      const res = await fetch(`/api/review/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          attemptId: session.attemptId,
          itemId: currentItem.id,
          response,
          confidence,
          timeMs: elapsed,
        }),
      });
      const data = (await res.json()) as SubmitAnswerResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not submit your answer.");
      }
      setSession((prev) => ({
        ...prev,
        answered: {
          ...prev.answered,
          [currentItem.id]: {
            response,
            confidence,
            result: data.result,
            timeMs: elapsed,
          },
        },
        summary: data.summary ?? prev.summary,
      }));
      if (data.completed && data.summary) {
        // Keep feedback visible on the last question; user clicks "See Results"
        setSummary(data.summary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error while saving.");
    } finally {
      setSubmitting(false);
    }
  }

  const [showSummaryScreen, setShowSummaryScreen] = useState(
    initialSession.status === "completed" && !!initialSession.summary,
  );

  async function handleRestart() {
    setRestarting(true);
    setError(null);
    try {
      await onStartCheckpoint(session.checkpoint.id, true);
      setShowSummaryScreen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restart round.");
    } finally {
      setRestarting(false);
    }
  }

  const answeredCount = Object.keys(session.answered).length;
  const totalCount = session.items.length;
  const allAnswered = answeredCount >= totalCount;

  if (showSummaryScreen && summary) {
    return (
      <section
        className="mx-auto max-w-2xl rounded-lg border-2 border-amber-300 bg-[#fffaf2] p-6 shadow-md sm:p-8"
        aria-labelledby="quest-result-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950">
            <Trophy size={14} aria-hidden="true" />
            Checkpoint {session.checkpoint.code} • Attempt #{session.attemptNumber}
          </span>
          <StarsRow stars={summary.stars} size={26} />
        </div>

        <div className="mt-6 text-center">
          <div
            className={`mx-auto inline-flex size-20 items-center justify-center rounded-full border-4 ${
              summary.passed
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            {summary.passed ? (
              <Award size={40} aria-hidden="true" />
            ) : (
              <RotateCcw size={36} aria-hidden="true" />
            )}
          </div>

          <h1
            id="quest-result-heading"
            className="font-display mt-4 text-3xl font-bold tracking-tight text-stone-900"
          >
            {summary.passed
              ? summary.scorePct === 100
                ? "Flawless Mastery!"
                : "Checkpoint Cleared!"
              : "Almost There — Try One More Round!"}
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            {summary.passed
              ? `You scored ${summary.scorePct}% (pass target ${session.checkpoint.passPercent}%) and unlocked the next step on the path.`
              : `You scored ${summary.scorePct}%. Score at least ${session.checkpoint.passPercent}% to unlock the next checkpoint — fresh questions await!`}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="text-xs font-medium text-stone-600">Score</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
              {summary.scorePct}%
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="text-xs font-medium text-stone-600">Points</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
              {summary.pointsEarned} / {summary.pointsMax}
            </div>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="text-xs font-medium text-stone-600">Time</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
              {formatDuration(summary.durationMs)}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {summary.passed && summary.nextCheckpoint && (
            <Button
              type="button"
              onClick={() => onStartCheckpoint(summary.nextCheckpoint!.checkpointId)}
              disabled={restarting}
              className="gap-2"
            >
              Next: {summary.nextCheckpoint.code} {summary.nextCheckpoint.title}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            variant={summary.passed ? "outline" : "default"}
            onClick={handleRestart}
            disabled={restarting}
            className="gap-2"
          >
            {restarting ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={16} aria-hidden="true" />
            )}
            {summary.passed ? "Replay for 3 Stars" : "Play Again (New Draw)"}
          </Button>
          <Button type="button" variant="ghost" onClick={onExitToTrail} className="gap-2">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Chapter Path
          </Button>
        </div>
      </section>
    );
  }

  if (!currentItem) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Top Game Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExitToTrail}
            className="shrink-0 gap-1.5"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Path
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                {session.checkpoint.code}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {session.checkpoint.title}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {session.game.name} • Need {session.checkpoint.passPercent}% to clear • Attempt #
              {session.attemptNumber}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          disabled={restarting}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RotateCcw size={14} aria-hidden="true" />
          New Round
        </Button>
      </div>

      {/* Progress Segmented Track */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Challenge {index + 1} of {totalCount}
          </span>
          <span className="tabular-nums">
            {answeredCount} / {totalCount} answered
          </span>
        </div>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${totalCount}, minmax(0, 1fr))` }}
          role="list"
          aria-label="Question progress"
        >
          {session.items.map((it, idx) => {
            const ans = session.answered[it.id];
            const isCurrent = idx === index;
            const bg = ans
              ? ans.result.correct
                ? "bg-emerald-600"
                : ans.result.score > 0
                  ? "bg-amber-500"
                  : "bg-red-500"
              : isCurrent
                ? "bg-primary"
                : "bg-stone-200";
            return (
              <button
                key={it.id}
                type="button"
                role="listitem"
                onClick={() => setIndex(idx)}
                aria-label={`Go to question ${idx + 1}${ans ? (ans.result.correct ? " (correct)" : " (incorrect)") : ""}`}
                className={`h-2.5 cursor-pointer rounded-full transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${bg} ${
                  isCurrent ? "ring-2 ring-primary ring-offset-1" : "opacity-85 hover:opacity-100"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Sparkles size={13} aria-hidden="true" />
            {session.game.name}
          </span>
          <span className="text-xs font-medium capitalize text-muted-foreground">
            Skill: {currentItem.skill}
          </span>
        </div>

        <h2 className="whitespace-pre-line text-base font-semibold leading-relaxed text-foreground sm:text-lg">
          {currentItem.prompt}
        </h2>

        {currentItem.code && (
          <pre className="mt-3 overflow-x-auto rounded-md border border-stone-800 bg-stone-900 p-3.5 font-mono text-xs leading-relaxed text-amber-100 sm:text-sm">
            <code>{currentItem.code}</code>
          </pre>
        )}

        {/* Interactive Workspace by Item Kind */}
        <div className="mt-5">
          {currentItem.kind === "mcq" && (
            <div className="grid gap-2.5" role="radiogroup" aria-label="Answer choices">
              {currentItem.options.map((opt, oi) => {
                const selected = mcqChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!!savedAnswer}
                    onClick={() => setMcqChoice(opt.id)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-md border p-3.5 text-left text-sm transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default ${
                      selected
                        ? "border-primary bg-secondary/70 font-medium text-foreground shadow-xs"
                        : "border-border bg-background hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <span
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="pt-0.5 leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentItem.kind === "multi" && (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                Select {currentItem.pick} correct options ({multiChoices.length} selected):
              </p>
              {currentItem.options.map((opt) => {
                const checked = multiChoices.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    disabled={!!savedAnswer}
                    onClick={() =>
                      setMultiChoices((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id],
                      )
                    }
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-md border p-3.5 text-left text-sm transition-[border-color,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default ${
                      checked
                        ? "border-primary bg-secondary/70 font-medium text-foreground"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border text-xs font-bold ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-stone-400 bg-white"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentItem.kind === "order" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Use the Up/Down buttons (or tap two lines to swap them) into the right sequence:
              </p>
              {orderList.map((stepId, pos) => {
                const step = currentItem.steps.find((s) => s.id === stepId);
                if (!step) return null;
                const pickedForSwap = swapPick === pos;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 rounded-md border p-2.5 transition-colors duration-150 ${
                      pickedForSwap
                        ? "border-primary bg-secondary/70"
                        : "border-border bg-background"
                    }`}
                  >
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-xs font-bold text-foreground">
                      {pos + 1}
                    </span>
                    <button
                      type="button"
                      disabled={!!savedAnswer}
                      onClick={() => {
                        if (swapPick === null) setSwapPick(pos);
                        else if (swapPick === pos) setSwapPick(null);
                        else {
                          setOrderList((prev) => {
                            const copy = [...prev];
                            [copy[swapPick], copy[pos]] = [copy[pos], copy[swapPick]];
                            return copy;
                          });
                          setSwapPick(null);
                        }
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-left font-mono text-xs leading-snug text-foreground sm:text-sm disabled:cursor-default"
                    >
                      {step.text}
                    </button>
                    {!savedAnswer && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Move step ${pos + 1} up`}
                          disabled={pos === 0}
                          onClick={() =>
                            setOrderList((prev) => {
                              const copy = [...prev];
                              [copy[pos - 1], copy[pos]] = [copy[pos], copy[pos - 1]];
                              return copy;
                            })
                          }
                          className="cursor-pointer rounded-sm border border-border p-1.5 hover:bg-secondary disabled:opacity-35"
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move step ${pos + 1} down`}
                          disabled={pos === orderList.length - 1}
                          onClick={() =>
                            setOrderList((prev) => {
                              const copy = [...prev];
                              [copy[pos + 1], copy[pos]] = [copy[pos], copy[pos + 1]];
                              return copy;
                            })
                          }
                          className="cursor-pointer rounded-sm border border-border p-1.5 hover:bg-secondary disabled:opacity-35"
                        >
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentItem.kind === "match" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Tap an item on the left, then tap its matching partner on the right (
                {Object.keys(matchPairs).length}/{currentItem.left.length} paired):
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prompt
                  </div>
                  {currentItem.left.map((l, li) => {
                    const pairedRight = matchPairs[l.id];
                    const active = matchLeft === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!!savedAnswer}
                        onClick={() => {
                          if (pairedRight) {
                            setMatchPairs((prev) => {
                              const next = { ...prev };
                              delete next[l.id];
                              return next;
                            });
                          }
                          setMatchLeft(active ? null : l.id);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border p-3 text-left text-xs sm:text-sm transition-colors duration-150 ${
                          active
                            ? "border-primary bg-secondary font-semibold"
                            : pairedRight
                              ? "border-amber-400 bg-amber-50/70"
                              : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <span>{l.text}</span>
                        <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-800">
                          {pairedRight ? `#${li + 1}` : "Pick"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Partner
                  </div>
                  {currentItem.right.map((r) => {
                    const ownerEntry = Object.entries(matchPairs).find(
                      ([, rid]) => rid === r.id,
                    );
                    const ownerIdx = ownerEntry
                      ? currentItem.left.findIndex((l) => l.id === ownerEntry[0])
                      : -1;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={!!savedAnswer}
                        onClick={() => {
                          if (matchLeft) {
                            setMatchPairs((prev) => {
                              const next: Record<string, string> = {};
                              for (const [k, v] of Object.entries(prev)) {
                                if (v !== r.id && k !== matchLeft) next[k] = v;
                              }
                              next[matchLeft] = r.id;
                              return next;
                            });
                            setMatchLeft(null);
                          } else if (ownerEntry) {
                            setMatchPairs((prev) => {
                              const next = { ...prev };
                              delete next[ownerEntry[0]];
                              return next;
                            });
                          }
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border p-3 text-left text-xs sm:text-sm transition-colors duration-150 ${
                          ownerIdx >= 0
                            ? "border-amber-400 bg-amber-50/70 font-medium"
                            : matchLeft
                              ? "border-dashed border-primary/60 bg-background hover:bg-secondary/40"
                              : "border-border bg-background"
                        }`}
                      >
                        <span>{r.text}</span>
                        {ownerIdx >= 0 && (
                          <span className="shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                            #{ownerIdx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentItem.kind === "sort" && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground">
                Tap a card below, then tap the basket it belongs in (
                {Object.keys(sortPlacement).length}/{currentItem.cards.length} sorted):
              </p>

              {/* Unsorted tray */}
              <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-stone-300 bg-muted/40 p-3">
                {currentItem.cards.filter((c) => !sortPlacement[c.id]).length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    All cards placed in baskets! Tap any card inside a basket if you want to move it.
                  </span>
                ) : (
                  currentItem.cards
                    .filter((c) => !sortPlacement[c.id])
                    .map((card) => {
                      const active = sortPick === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          disabled={!!savedAnswer}
                          onClick={() => setSortPick(active ? null : card.id)}
                          className={`cursor-pointer rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 sm:text-sm ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          {card.text}
                        </button>
                      );
                    })
                )}
              </div>

              {/* Destination Baskets */}
              <div className="grid gap-3 sm:grid-cols-2">
                {currentItem.buckets.map((b) => {
                  const inside = currentItem.cards.filter(
                    (c) => sortPlacement[c.id] === b.id,
                  );
                  return (
                    <div
                      key={b.id}
                      className={`rounded-lg border p-3 transition-colors duration-150 ${
                        sortPick
                          ? "border-primary/60 bg-secondary/25"
                          : "border-border bg-background"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!!savedAnswer || !sortPick}
                        onClick={() => {
                          if (!sortPick) return;
                          setSortPlacement((prev) => ({ ...prev, [sortPick]: b.id }));
                          setSortPick(null);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-border pb-2 text-left text-sm font-bold text-foreground disabled:cursor-default"
                      >
                        <span>{b.label}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
                          {sortPick ? "Drop here +" : inside.length}
                        </span>
                      </button>
                      <div className="mt-2.5 flex min-h-10 flex-wrap gap-1.5">
                        {inside.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={!!savedAnswer}
                            onClick={() =>
                              setSortPick((prev) => (prev === c.id ? null : c.id))
                            }
                            className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors duration-150 ${
                              sortPick === c.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-amber-300 bg-amber-50 text-stone-900 hover:border-primary"
                            }`}
                          >
                            {c.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentItem.kind === "input" && (
            <div className="max-w-md space-y-2">
              <label
                htmlFor={`quest-input-${currentItem.id}`}
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Your Answer
              </label>
              <input
                id={`quest-input-${currentItem.id}`}
                type="text"
                inputMode={currentItem.inputMode === "numeric" ? "numeric" : "text"}
                disabled={!!savedAnswer}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && readyToSubmit && !savedAnswer) {
                    e.preventDefault();
                    void handleCheck("sure");
                  }
                }}
                placeholder={currentItem.placeholder ?? "Type your answer…"}
                className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 font-mono text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          )}

          {currentItem.kind === "bug" && (
            <div className="space-y-1.5" role="radiogroup" aria-label="Code lines — tap the faulty line">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Tap the ONE line that contains the error:
              </p>
              {currentItem.lines.map((line, li) => {
                const picked = bugLine === li;
                return (
                  <button
                    key={li}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    disabled={!!savedAnswer}
                    onClick={() => setBugLine(li)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-left font-mono text-xs transition-colors duration-150 sm:text-sm ${
                      picked
                        ? "border-red-600 bg-red-50 font-semibold text-red-950"
                        : "border-stone-700 bg-stone-900 text-stone-100 hover:border-amber-400"
                    }`}
                  >
                    <span
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold ${
                        picked ? "bg-red-600 text-white" : "bg-stone-800 text-stone-400"
                      }`}
                    >
                      {li + 1}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{line}</span>
                    {picked && <Bug size={16} className="shrink-0 text-red-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {currentItem.kind === "binary" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm">
                <span className="font-medium text-foreground">
                  Target decimal value:{" "}
                  <strong className="font-mono text-base text-primary">
                    {currentItem.target}₁₀
                  </strong>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Current bits: <strong className="text-foreground">{bitsValue}₂</strong>
                </span>
              </div>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(currentItem.bits, 4)}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: currentItem.bits }).map((_, bi) => {
                  const weight = 2 ** (currentItem.bits - 1 - bi);
                  const on = bitsValue[bi] === "1";
                  return (
                    <button
                      key={bi}
                      type="button"
                      disabled={!!savedAnswer}
                      aria-pressed={on}
                      aria-label={`Bit ${weight} (${on ? "1, ON" : "0, OFF"})`}
                      onClick={() => {
                        setBitsValue((prev) => {
                          const chars = prev.split("");
                          chars[bi] = chars[bi] === "1" ? "0" : "1";
                          return chars.join("");
                        });
                      }}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 p-3 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring ${
                        on
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="text-[11px] font-medium opacity-80">2^{currentItem.bits - 1 - bi} = {weight}</span>
                      <span className="mt-1 font-mono text-2xl font-bold">{on ? "1" : "0"}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider opacity-85">
                        {on ? "ON" : "OFF"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {/* Submit OR Feedback Footer */}
        {!savedAnswer ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Pick how confident you feel to check your answer:
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={!readyToSubmit || submitting}
                onClick={() => handleCheck("unsure")}
                className="gap-1.5"
              >
                <HelpCircle size={15} aria-hidden="true" />
                Check (Not 100% sure)
              </Button>
              <Button
                type="button"
                disabled={!readyToSubmit || submitting}
                onClick={() => handleCheck("sure")}
                className="gap-1.5"
              >
                {submitting ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={15} aria-hidden="true" />
                )}
                Check (I&apos;m sure!)
              </Button>
            </div>
          </div>
        ) : (
          <FeedbackBanner
            result={savedAnswer.result}
            isLast={index === totalCount - 1}
            allAnswered={allAnswered}
            onNext={() => {
              if (allAnswered && index === totalCount - 1) {
                setShowSummaryScreen(true);
              } else {
                const nextUnanswered = session.items.findIndex(
                  (it, idx) => idx > index && !(it.id in session.answered),
                );
                setIndex(
                  nextUnanswered >= 0
                    ? nextUnanswered
                    : Math.min(totalCount - 1, index + 1),
                );
              }
            }}
            onShowResults={() => setShowSummaryScreen(true)}
          />
        )}
      </article>
    </div>
  );
}

function FeedbackBanner({
  result,
  isLast,
  allAnswered,
  onNext,
  onShowResults,
}: {
  result: GradeResult;
  isLast: boolean;
  allAnswered: boolean;
  onNext: () => void;
  onShowResults: () => void;
}) {
  const tone = result.correct
    ? "border-emerald-300 bg-emerald-50/90 text-emerald-950"
    : result.score > 0
      ? "border-amber-300 bg-amber-50/90 text-amber-950"
      : "border-red-300 bg-red-50/90 text-red-950";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 rounded-lg border p-4 ${tone}`}
    >
      <div className="flex items-start gap-3">
        {result.correct ? (
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
        ) : result.score > 0 ? (
          <ShieldAlert size={22} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        ) : (
          <XCircle size={22} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="font-bold">
            {result.correct
              ? "Spot on!"
              : result.score > 0
                ? `Partial credit (${Math.round(result.score * 100)}%)`
                : "Not quite — learn from this one:"}
          </div>
          {!result.correct && (
            <p className="text-xs sm:text-sm">
              <span className="font-semibold">Correct answer: </span>
              <span className="font-mono">{result.solution}</span>
            </p>
          )}
          <p className="text-xs leading-relaxed opacity-95 sm:text-sm">
            {result.explanation}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {allAnswered && (
          <Button type="button" onClick={onShowResults} className="gap-1.5">
            See Checkpoint Score
            <Trophy size={15} aria-hidden="true" />
          </Button>
        )}
        {(!allAnswered || !isLast) && (
          <Button
            type="button"
            variant={allAnswered ? "outline" : "default"}
            onClick={onNext}
            className="gap-1.5"
          >
            Next Challenge
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
