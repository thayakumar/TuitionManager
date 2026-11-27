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
  Flame,
  HelpCircle,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import {
  Gem3D,
  QuestCompanion,
  StarTrio3D,
  TreasureChest3D,
  VictoryConfetti,
} from "./quest-art";
import { questSfx } from "@/lib/review/sfx";
import type {
  ActiveSessionPayload,
  SubmitAnswerResult,
} from "@/lib/review/service";
import type {
  ClientItem,
  Confidence,
  GradeResult,
  ItemResponse,
  Skill,
} from "@/lib/review/types";

const SKILL_LABELS_BM: Record<Skill, string> = {
  recall: "Ingat Kembali",
  understand: "Kefahaman",
  apply: "Aplikasi",
  analyse: "Analisis",
  trace: "Semakan Meja",
  debug: "Kesan Ralat",
};

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function GamePlayer({
  studentId,
  session: initialSession,
  muted,
  onToggleMute,
  onExitToTrail,
  onStartCheckpoint,
}: {
  studentId: number;
  session: ActiveSessionPayload;
  muted: boolean;
  onToggleMute: () => void;
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
  const [streak, setStreak] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setStreak(0);
    const nextIdx = initialSession.items.findIndex(
      (it) => !(it.id in initialSession.answered),
    );
    setIndex(nextIdx >= 0 ? nextIdx : 0);
  }, [initialSession]);

  const currentItem: ClientItem | undefined = session.items[index];
  const savedAnswer = currentItem ? session.answered[currentItem.id] : undefined;

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
      setError("Sila lengkapkan jawapan anda di atas sebelum menyemak.");
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
        throw new Error(data.error || "Gagal menghantar jawapan anda.");
      }

      const nextStreak = data.result.correct ? streak + 1 : 0;
      setStreak(nextStreak);
      if (data.result.correct) {
        questSfx.correct(nextStreak);
      } else {
        questSfx.gentleMiss();
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
        setSummary(data.summary);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat rangkaian semasa menyimpan jawapan.");
    } finally {
      setSubmitting(false);
    }
  }

  const [showSummaryScreen, setShowSummaryScreen] = useState(
    initialSession.status === "completed" && !!initialSession.summary,
  );

  function openSummaryWithSound() {
    setShowSummaryScreen(true);
    if (summary?.passed) questSfx.victory();
    else questSfx.encourage();
  }

  async function handleRestart() {
    questSfx.tap();
    setRestarting(true);
    setError(null);
    try {
      await onStartCheckpoint(session.checkpoint.id, true);
      setShowSummaryScreen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak dapat memulakan pusingan baharu.");
    } finally {
      setRestarting(false);
    }
  }

  const answeredCount = Object.keys(session.answered).length;
  const totalCount = session.items.length;
  const allAnswered = answeredCount >= totalCount;

  // =========================================================================
  // SKRIN KEPUTUSAN & GANJARAN BINTANG
  // =========================================================================
  if (showSummaryScreen && summary) {
    const earnedGems = summary.passed
      ? 100 + summary.stars * 50
      : Math.max(15, Math.round(summary.pointsEarned * 10));

    return (
      <section
        className="quest-parchment-board relative mx-auto max-w-2xl overflow-hidden p-6 sm:p-9"
        aria-labelledby="quest-result-heading"
      >
        {summary.passed && <VictoryConfetti />}

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#d4a373]/50 pb-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#9a3e1a] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-100">
            <Trophy size={14} aria-hidden="true" />
            Tahap {session.checkpoint.code} • Cubaan #{session.attemptNumber}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-cyan-700/30 bg-cyan-950/80 px-3 py-1 text-xs font-extrabold text-cyan-100">
            <Gem3D size={16} />+{earnedGems} XP
          </span>
        </div>

        <div className="relative z-10 mt-6 flex flex-col items-center text-center">
          {session.checkpoint.boss ? (
            <TreasureChest3D
              state={summary.passed ? "opened" : "ready"}
              size={84}
            />
          ) : (
            <div className="mb-1">
              <StarTrio3D stars={summary.stars} size={38} pop />
            </div>
          )}

          {session.checkpoint.boss && (
            <div className="mt-2">
              <StarTrio3D stars={summary.stars} size={30} pop />
            </div>
          )}

          <h1
            id="quest-result-heading"
            className="font-display mt-4 text-3xl font-extrabold tracking-tight text-stone-900"
          >
            {summary.passed
              ? summary.scorePct === 100
                ? "Syabas! 3 Bintang Penuh!"
                : "Tahniah! Checkpoint Berjaya Dibuka!"
              : "Percubaan Baik — Cuba Satu Pusingan Lagi!"}
          </h1>
          <p className="mt-2 max-w-md text-sm font-medium text-stone-700">
            {summary.passed
              ? `Hebat! Anda memperoleh ${summary.scorePct}% (sasaran lulus ${session.checkpoint.passPercent}%) dan membuka laluan ke tahap seterusnya.`
              : `Anda mencapai ${summary.scorePct}%. Capai sekurang-kurangnya ${session.checkpoint.passPercent}% untuk membuka batu loncatan seterusnya — setiap cubaan baharu memberi set soalan segar!`}
          </p>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border-2 border-[#d4a373] bg-[#fffdf8] p-3 shadow-2xs">
            <div className="text-xs font-bold text-[#8c4319]">Skor</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900">
              {summary.scorePct}%
            </div>
          </div>
          <div className="rounded-xl border-2 border-[#d4a373] bg-[#fffdf8] p-3 shadow-2xs">
            <div className="text-xs font-bold text-[#8c4319]">Mata</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900">
              {summary.pointsEarned} / {summary.pointsMax}
            </div>
          </div>
          <div className="rounded-xl border-2 border-[#d4a373] bg-[#fffdf8] p-3 shadow-2xs">
            <div className="text-xs font-bold text-[#8c4319]">Masa</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900">
              {formatDuration(summary.durationMs)}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="relative z-10 mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {summary.passed && summary.nextCheckpoint && (
            <button
              type="button"
              onClick={() =>
                onStartCheckpoint(summary.nextCheckpoint!.checkpointId)
              }
              disabled={restarting}
              className="quest-3d-btn quest-3d-btn-emerald inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-extrabold"
            >
              Tahap Seterusnya: {summary.nextCheckpoint.code}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            disabled={restarting}
            className={`quest-3d-btn inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-extrabold ${
              summary.passed ? "quest-3d-btn-gold" : "quest-3d-btn-primary"
            }`}
          >
            {restarting ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={16} aria-hidden="true" />
            )}
            {summary.passed ? "Main Semula (Kejar 3 Bintang)" : "Cuba Lagi!"}
          </button>
          <button
            type="button"
            onClick={onExitToTrail}
            className="quest-3d-btn inline-flex cursor-pointer items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-stone-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Peta Laluan
          </button>
        </div>
      </section>
    );
  }

  if (!currentItem) return null;

  const companionMood = savedAnswer
    ? savedAnswer.result.correct
      ? streak >= 2
        ? "streak"
        : "happy"
      : "coach"
    : streak >= 2
      ? "streak"
      : "ready";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Bar HUD Papan Kayu 3D */}
      <div className="quest-wood-signboard flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onExitToTrail}
            className="quest-3d-btn quest-3d-btn-gold inline-flex shrink-0 cursor-pointer items-center gap-1 px-3 py-1.5 text-xs font-extrabold"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Laluan
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-400 px-2 py-0.5 font-mono text-xs font-extrabold text-amber-950">
                {session.checkpoint.code}
              </span>
              <span className="truncate text-sm font-extrabold text-white">
                {session.checkpoint.title}
              </span>
            </div>
            <p className="truncate text-[11px] font-medium text-amber-100/85">
              {session.game.name} • Lulus {session.checkpoint.passPercent}% • Cubaan #
              {session.attemptNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-xs">
              <Flame size={13} aria-hidden="true" />
              {streak}× Kombo!
            </span>
          )}
          <button
            type="button"
            onClick={handleRestart}
            disabled={restarting}
            title="Mulakan pusingan baharu dengan soalan dikocok"
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-200/40 bg-black/25 px-2.5 py-1 text-xs font-bold text-amber-100 hover:bg-black/40"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Kocok
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Hidupkan kesan bunyi" : "Senyapkan kesan bunyi"}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-amber-200/40 bg-black/25 text-amber-100 hover:bg-black/40"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* Teman Kembara + Penunjuk Soalan */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <QuestCompanion mood={companionMood} />
        <span className="font-mono text-xs font-extrabold text-muted-foreground">
          Soalan {index + 1} / {totalCount}
        </span>
      </div>

      <div
        className="grid gap-2 px-1"
        style={{ gridTemplateColumns: `repeat(${totalCount}, minmax(0, 1fr))` }}
        role="list"
        aria-label="Senarai soalan"
      >
        {session.items.map((it, idx) => {
          const ans = session.answered[it.id];
          const isCurrent = idx === index;
          const bg = ans
            ? ans.result.correct
              ? "bg-emerald-500 border-emerald-700"
              : ans.result.score > 0
                ? "bg-amber-400 border-amber-700"
                : "bg-orange-400 border-orange-700"
            : isCurrent
              ? "bg-amber-400 border-amber-800"
              : "bg-stone-200 border-stone-300";
          return (
            <button
              key={it.id}
              type="button"
              role="listitem"
              onClick={() => {
                questSfx.tap();
                setIndex(idx);
              }}
              aria-label={`Soalan ${idx + 1}${ans ? (ans.result.correct ? " (betul)" : " (disemak)") : ""}`}
              className={`h-3.5 cursor-pointer rounded-full border-b-2 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-ring ${bg} ${
                isCurrent ? "ring-2 ring-primary ring-offset-1" : "opacity-85 hover:opacity-100"
              }`}
            />
          );
        })}
      </div>

      {/* Pentas Soalan 3D */}
      <article className="quest-parchment-board p-5 sm:p-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c2783e] bg-[#fff8ea] px-3 py-0.5 text-xs font-extrabold text-[#9a3e1a]">
            <Sparkles size={13} aria-hidden="true" />
            {session.game.name}
          </span>
          <span className="rounded-full bg-[#9a3e1a]/10 px-2.5 py-0.5 text-xs font-bold text-[#7c3415]">
            {SKILL_LABELS_BM[currentItem.skill] ?? currentItem.skill}
          </span>
        </div>

        <h2 className="whitespace-pre-line text-base font-extrabold leading-relaxed text-stone-900 sm:text-lg">
          {currentItem.prompt}
        </h2>

        {currentItem.code && (
          <pre className="mt-3.5 overflow-x-auto rounded-xl border-2 border-stone-800 bg-stone-900 p-4 font-mono text-xs leading-relaxed text-amber-100 shadow-inner sm:text-sm">
            <code>{currentItem.code}</code>
          </pre>
        )}

        {/* Mekanik Permainan Interaktif */}
        <div className="mt-5">
          {currentItem.kind === "mcq" && (
            <div className="grid gap-3" role="radiogroup" aria-label="Pilihan jawapan">
              {currentItem.options.map((opt, oi) => {
                const selected = mcqChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!!savedAnswer}
                    onClick={() => {
                      questSfx.tap();
                      setMcqChoice(opt.id);
                    }}
                    className={`quest-3d-btn flex w-full cursor-pointer items-start gap-3 p-3.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default ${
                      selected
                        ? "border-[#b82f25] bg-[#fff0e5] font-bold text-stone-900"
                        : "border-[#d4b499] bg-[#fffdf9] text-stone-800 hover:border-[#c2783e]"
                    }`}
                  >
                    <span
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold ${
                        selected
                          ? "bg-[#d93624] text-white"
                          : "bg-amber-100 text-[#7c3415]"
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
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#7c3415]">
                Pilih {currentItem.pick} jawapan yang betul ({multiChoices.length} dipilih):
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
                    onClick={() => {
                      questSfx.tap();
                      setMultiChoices((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id],
                      );
                    }}
                    className={`quest-3d-btn flex w-full cursor-pointer items-start gap-3 p-3.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default ${
                      checked
                        ? "border-[#b82f25] bg-[#fff0e5] font-bold text-stone-900"
                        : "border-[#d4b499] bg-[#fffdf9] text-stone-800"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-extrabold ${
                        checked
                          ? "border-[#b82f25] bg-[#d93624] text-white"
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
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-[#7c3415]">
                Tekan dua blok untuk menukar kedudukan, atau guna anak panah Atas / Bawah:
              </p>
              {orderList.map((stepId, pos) => {
                const step = currentItem.steps.find((s) => s.id === stepId);
                if (!step) return null;
                const pickedForSwap = swapPick === pos;
                return (
                  <div
                    key={step.id}
                    className={`quest-3d-btn flex items-center gap-2.5 p-2.5 ${
                      pickedForSwap
                        ? "border-[#b82f25] bg-[#fff0e5]"
                        : "border-[#d4b499] bg-[#fffdf9]"
                    }`}
                  >
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-200 font-mono text-xs font-extrabold text-amber-950">
                      {pos + 1}
                    </span>
                    <button
                      type="button"
                      disabled={!!savedAnswer}
                      onClick={() => {
                        if (swapPick === null) {
                          questSfx.tap();
                          setSwapPick(pos);
                        } else if (swapPick === pos) {
                          questSfx.tap();
                          setSwapPick(null);
                        } else {
                          questSfx.flip(true);
                          setOrderList((prev) => {
                            const copy = [...prev];
                            [copy[swapPick], copy[pos]] = [copy[pos], copy[swapPick]];
                            return copy;
                          });
                          setSwapPick(null);
                        }
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-left font-mono text-xs font-semibold leading-snug text-stone-900 sm:text-sm disabled:cursor-default"
                    >
                      {step.text}
                    </button>
                    {!savedAnswer && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Gerakkan blok ${pos + 1} ke atas`}
                          disabled={pos === 0}
                          onClick={() => {
                            questSfx.flip(true);
                            setOrderList((prev) => {
                              const copy = [...prev];
                              [copy[pos - 1], copy[pos]] = [copy[pos], copy[pos - 1]];
                              return copy;
                            });
                          }}
                          className="cursor-pointer rounded-lg border-2 border-[#d4b499] bg-white p-1.5 hover:bg-amber-50 disabled:opacity-35"
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Gerakkan blok ${pos + 1} ke bawah`}
                          disabled={pos === orderList.length - 1}
                          onClick={() => {
                            questSfx.flip(false);
                            setOrderList((prev) => {
                              const copy = [...prev];
                              [copy[pos + 1], copy[pos]] = [copy[pos], copy[pos + 1]];
                              return copy;
                            });
                          }}
                          className="cursor-pointer rounded-lg border-2 border-[#d4b499] bg-white p-1.5 hover:bg-amber-50 disabled:opacity-35"
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
              <p className="text-xs font-bold text-[#7c3415]">
                Tekan kad di sebelah kiri, kemudian tekan pasangannya di sebelah kanan (
                {Object.keys(matchPairs).length}/{currentItem.left.length} dipadankan):
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2.5">
                  {currentItem.left.map((l, li) => {
                    const pairedRight = matchPairs[l.id];
                    const active = matchLeft === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!!savedAnswer}
                        onClick={() => {
                          questSfx.tap();
                          if (pairedRight) {
                            setMatchPairs((prev) => {
                              const next = { ...prev };
                              delete next[l.id];
                              return next;
                            });
                          }
                          setMatchLeft(active ? null : l.id);
                        }}
                        className={`quest-3d-btn flex w-full cursor-pointer items-center justify-between gap-2 p-3 text-left text-xs sm:text-sm ${
                          active
                            ? "border-[#b82f25] bg-[#fff0e5] font-extrabold"
                            : pairedRight
                              ? "border-emerald-600 bg-emerald-50 font-semibold"
                              : "border-[#d4b499] bg-[#fffdf9]"
                        }`}
                      >
                        <span className="text-stone-900">{l.text}</span>
                        <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-950">
                          {pairedRight ? `#${li + 1}` : "Pilih"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2.5">
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
                            questSfx.flip(true);
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
                            questSfx.tap();
                            setMatchPairs((prev) => {
                              const next = { ...prev };
                              delete next[ownerEntry[0]];
                              return next;
                            });
                          }
                        }}
                        className={`quest-3d-btn flex w-full cursor-pointer items-center justify-between gap-2 p-3 text-left text-xs sm:text-sm ${
                          ownerIdx >= 0
                            ? "border-emerald-600 bg-emerald-50 font-semibold"
                            : matchLeft
                              ? "border-dashed border-[#b82f25] bg-[#fffdf9]"
                              : "border-[#d4b499] bg-[#fffdf9]"
                        }`}
                      >
                        <span className="text-stone-900">{r.text}</span>
                        {ownerIdx >= 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-white">
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
              <p className="text-xs font-bold text-[#7c3415]">
                Tekan kad di dalam dulang, kemudian tekan bakul kategori yang sepadan (
                {Object.keys(sortPlacement).length}/{currentItem.cards.length} diasingkan):
              </p>

              <div className="flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-[#c2783e]/60 bg-[#fff8ea]/80 p-3">
                {currentItem.cards.filter((c) => !sortPlacement[c.id]).length === 0 ? (
                  <span className="text-xs font-semibold text-[#7c3415]">
                    Semua kad telah dimasukkan ke dalam bakul! Tekan mana-mana kad di dalam bakul jika mahu memindahkannya.
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
                          onClick={() => {
                            questSfx.tap();
                            setSortPick(active ? null : card.id);
                          }}
                          className={`quest-3d-btn cursor-pointer px-3 py-2 text-left text-xs font-bold sm:text-sm ${
                            active
                              ? "quest-3d-btn-primary"
                              : "border-[#d4b499] bg-white text-stone-900"
                          }`}
                        >
                          {card.text}
                        </button>
                      );
                    })
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentItem.buckets.map((b) => {
                  const inside = currentItem.cards.filter(
                    (c) => sortPlacement[c.id] === b.id,
                  );
                  return (
                    <div
                      key={b.id}
                      className={`rounded-xl border-2 p-3.5 transition-colors duration-150 ${
                        sortPick
                          ? "border-[#b82f25] bg-[#fff0e5]/70"
                          : "border-[#c2783e] bg-[#fffdf9]"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!!savedAnswer || !sortPick}
                        onClick={() => {
                          if (!sortPick) return;
                          questSfx.flip(true);
                          setSortPlacement((prev) => ({ ...prev, [sortPick]: b.id }));
                          setSortPick(null);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-amber-300/70 pb-2 text-left text-sm font-extrabold text-stone-900 disabled:cursor-default"
                      >
                        <span>{b.label}</span>
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-950">
                          {sortPick ? "Letak Sini +" : inside.length}
                        </span>
                      </button>
                      <div className="mt-2.5 flex min-h-10 flex-wrap gap-1.5">
                        {inside.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={!!savedAnswer}
                            onClick={() => {
                              questSfx.tap();
                              setSortPick((prev) => (prev === c.id ? null : c.id));
                            }}
                            className={`cursor-pointer rounded-lg border-2 px-2.5 py-1.5 text-left text-xs font-bold ${
                              sortPick === c.id
                                ? "border-[#b82f25] bg-[#d93624] text-white"
                                : "border-emerald-500 bg-emerald-50 text-emerald-950"
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
                className="block text-xs font-extrabold uppercase tracking-wider text-[#7c3415]"
              >
                Jawapan Anda
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
                placeholder={currentItem.placeholder ?? "Taip jawapan anda…"}
                className="w-full rounded-xl border-2 border-[#c2783e] bg-white px-4 py-3 font-mono text-base font-bold text-stone-900 shadow-inner focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          )}

          {currentItem.kind === "bug" && (
            <div className="space-y-2" role="radiogroup" aria-label="Tekan baris yang mengandungi ralat">
              <p className="mb-2 text-xs font-bold text-[#7c3415]">
                Kesan ralat! Tekan SATU baris yang mengandungi kesilapan di bawah:
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
                    onClick={() => {
                      questSfx.tap();
                      setBugLine(li);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left font-mono text-xs transition-colors duration-120 sm:text-sm ${
                      picked
                        ? "border-red-600 bg-red-50 font-extrabold text-red-950 shadow-sm"
                        : "border-stone-700 bg-stone-900 text-stone-100 hover:border-amber-400"
                    }`}
                  >
                    <span
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        picked ? "bg-red-600 text-white" : "bg-stone-800 text-stone-400"
                      }`}
                    >
                      {li + 1}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap">{line}</span>
                    {picked && <Bug size={17} className="shrink-0 text-red-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}

          {currentItem.kind === "binary" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#c2783e] bg-[#fff8ea] px-4 py-2.5 text-sm">
                <span className="font-bold text-stone-800">
                  Sasaran Perpuluhan:{" "}
                  <strong className="font-mono text-lg text-[#b82f25]">
                    {currentItem.target}₁₀
                  </strong>
                </span>
                <span className="font-mono text-xs font-bold text-stone-600">
                  Suis Perduaan: <strong className="text-stone-900">{bitsValue}₂</strong>
                </span>
              </div>
              <div
                className="grid gap-2.5"
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
                      aria-label={`Nilai tempat ${weight} (${on ? "1, HIDUP" : "0, MATI"})`}
                      onClick={() => {
                        questSfx.flip(!on);
                        setBitsValue((prev) => {
                          const chars = prev.split("");
                          chars[bi] = chars[bi] === "1" ? "0" : "1";
                          return chars.join("");
                        });
                      }}
                      className={`quest-3d-btn flex cursor-pointer flex-col items-center justify-center p-3 focus-visible:outline-2 focus-visible:outline-ring ${
                        on
                          ? "quest-3d-btn-emerald"
                          : "border-[#c2783e] bg-[#fffdf9] text-stone-800"
                      }`}
                    >
                      <span className="text-[11px] font-bold opacity-85">
                        2^{currentItem.bits - 1 - bi} = {weight}
                      </span>
                      <span className="mt-1 font-mono text-2xl font-extrabold">
                        {on ? "1" : "0"}
                      </span>
                      <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                        {on ? "HIDUP" : "MATI"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}

        {/* Butang Semak 3D ATAU Maklum Balas Pengajaran */}
        {!savedAnswer ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#d4a373]/50 pt-4">
            <span className="text-xs font-bold text-[#7c3415]">
              Sudah sedia? Kunci jawapan anda:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!readyToSubmit || submitting}
                onClick={() => handleCheck("unsure")}
                className="quest-3d-btn quest-3d-btn-gold inline-flex cursor-pointer items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              >
                <HelpCircle size={15} aria-hidden="true" />
                Cuba Jawab (Kurang Pasti)
              </button>
              <button
                type="button"
                disabled={!readyToSubmit || submitting}
                onClick={() => handleCheck("sure")}
                className="quest-3d-btn quest-3d-btn-primary inline-flex cursor-pointer items-center gap-1.5 px-5 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              >
                {submitting ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={15} aria-hidden="true" />
                )}
                Kunci Jawapan (Yakin!)
              </button>
            </div>
          </div>
        ) : (
          <FeedbackBanner
            result={savedAnswer.result}
            isLast={index === totalCount - 1}
            allAnswered={allAnswered}
            onNext={() => {
              questSfx.tap();
              if (allAnswered && index === totalCount - 1) {
                openSummaryWithSound();
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
            onShowResults={openSummaryWithSound}
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
    ? "border-emerald-500 bg-emerald-50 text-emerald-950"
    : result.score > 0
      ? "border-amber-500 bg-amber-50 text-amber-950"
      : "border-orange-400 bg-orange-50 text-stone-900";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-6 rounded-xl border-2 p-4 shadow-xs ${tone}`}
    >
      <div className="flex items-start gap-3">
        {result.correct ? (
          <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : result.score > 0 ? (
          <ShieldAlert size={24} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        ) : (
          <XCircle size={24} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-sm font-extrabold sm:text-base">
            {result.correct
              ? "Mantap! Jawapan Tepat!"
              : result.score > 0
                ? `Hampir Tepat! Separa Betul (${Math.round(result.score * 100)}%)`
                : "Tip Penguasaan — Semak Penerangan Berikut:"}
          </div>
          {!result.correct && (
            <p className="text-xs sm:text-sm">
              <span className="font-bold">Jawapan Sebenar: </span>
              <span className="font-mono font-semibold">{result.solution}</span>
            </p>
          )}
          <p className="text-xs leading-relaxed sm:text-sm">
            {result.explanation}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2.5">
        {allAnswered && (
          <button
            type="button"
            onClick={onShowResults}
            className="quest-3d-btn quest-3d-btn-emerald inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-extrabold sm:text-sm"
          >
            Tebus Bintang & Skor!
            <Award size={16} aria-hidden="true" />
          </button>
        )}
        {(!allAnswered || !isLast) && (
          <button
            type="button"
            onClick={onNext}
            className="quest-3d-btn quest-3d-btn-primary inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-extrabold sm:text-sm"
          >
            Soalan Seterusnya
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
