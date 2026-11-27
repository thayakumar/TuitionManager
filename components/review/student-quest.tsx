"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Binary,
  CheckCircle2,
  Code2,
  Compass,
  Crown,
  Flame,
  GitBranch,
  LoaderCircle,
  Lock,
  MapPin,
  MountainSnow,
  Play,
  Sparkles,
  Star,
  Sun,
  Trees,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GamePlayer } from "./game-player";
import type {
  ActiveSessionPayload,
  StudentMapPayload,
} from "@/lib/review/service";
import type { ThemeId } from "@/lib/review/types";

type ThemeStyle = {
  label: string;
  boardBg: string;
  boardBorder: string;
  headerBg: string;
  nodeOpenBg: string;
  nodeOpenBorder: string;
  badgeBg: string;
  badgeText: string;
  trailStroke: string;
  Icon: typeof Trees;
};

const THEMES: Record<ThemeId, ThemeStyle> = {
  meadow: {
    label: "Emerald Meadow",
    boardBg: "bg-[#f1f8ef]",
    boardBorder: "border-emerald-300",
    headerBg: "bg-[#235d3a] text-white",
    nodeOpenBg: "bg-white hover:bg-emerald-50/80",
    nodeOpenBorder: "border-emerald-500",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    trailStroke: "#2f7a4c",
    Icon: Trees,
  },
  lagoon: {
    label: "Coral Lagoon",
    boardBg: "bg-[#eef8fa]",
    boardBorder: "border-cyan-300",
    headerBg: "bg-[#0e5a6f] text-white",
    nodeOpenBg: "bg-white hover:bg-cyan-50/80",
    nodeOpenBorder: "border-cyan-600",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-950",
    trailStroke: "#0e7490",
    Icon: Waves,
  },
  frost: {
    label: "Glacier Ridge",
    boardBg: "bg-[#f0f5fc]",
    boardBorder: "border-sky-300",
    headerBg: "bg-[#1e4273] text-white",
    nodeOpenBg: "bg-white hover:bg-sky-50/80",
    nodeOpenBorder: "border-sky-600",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-950",
    trailStroke: "#2563eb",
    Icon: MountainSnow,
  },
  candy: {
    label: "Amber Workshop",
    boardBg: "bg-[#fff6ed]",
    boardBorder: "border-orange-300",
    headerBg: "bg-[#9a3412] text-white",
    nodeOpenBg: "bg-white hover:bg-orange-50/80",
    nodeOpenBorder: "border-orange-500",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-950",
    trailStroke: "#d94e1f",
    Icon: Code2,
  },
  desert: {
    label: "Sunstone Dunes",
    boardBg: "bg-[#fdf8ec]",
    boardBorder: "border-amber-300",
    headerBg: "bg-[#854d0e] text-white",
    nodeOpenBg: "bg-white hover:bg-amber-50/80",
    nodeOpenBorder: "border-amber-500",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-950",
    trailStroke: "#b45309",
    Icon: Sun,
  },
  volcano: {
    label: "Ember Summit",
    boardBg: "bg-[#fef2f2]",
    boardBorder: "border-red-300",
    headerBg: "bg-[#7f1d1d] text-white",
    nodeOpenBg: "bg-white hover:bg-red-50/80",
    nodeOpenBorder: "border-red-500",
    badgeBg: "bg-red-100",
    badgeText: "text-red-950",
    trailStroke: "#b91c1c",
    Icon: Flame,
  },
};

const STATION_ICONS = [Compass, Binary, GitBranch, Code2, Sun, Flame];

function MiniStars({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={14}
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

export function StudentQuest({
  studentId,
  initialMap,
}: {
  studentId: number;
  initialMap: StudentMapPayload;
}) {
  const [map, setMap] = useState<StudentMapPayload>(initialMap);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSessionPayload | null>(null);
  const [loadingCp, setLoadingCp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshMap() {
    try {
      const res = await fetch(`/api/review/${studentId}?viewer=student`, {
        cache: "no-store",
      });
      if (res.ok) {
        const fresh = (await res.json()) as StudentMapPayload;
        setMap(fresh);
      }
    } catch {
      // Keep last known map state on transient offline hiccup
    }
  }

  async function startCheckpoint(checkpointId: string, forceRestart = false) {
    setLoadingCp(checkpointId);
    setError(null);
    try {
      const res = await fetch(`/api/review/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          checkpointId,
          forceRestart,
        }),
      });
      const data = (await res.json()) as ActiveSessionPayload & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not start this checkpoint.");
      }
      setActiveChapterId(data.chapter.id);
      setSession(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not launch checkpoint.");
    } finally {
      setLoadingCp(null);
    }
  }

  async function handleExitPlayer() {
    setSession(null);
    await refreshMap();
  }

  // 1. Active Game Session View
  if (session) {
    return (
      <GamePlayer
        studentId={studentId}
        session={session}
        onExitToTrail={handleExitPlayer}
        onStartCheckpoint={startCheckpoint}
      />
    );
  }

  // 2. Unset or Coming-Soon Form States
  if (map.status === "unset_form") {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-amber-300 bg-[#fffaf2] p-6 text-center shadow-xs sm:p-8">
        <Compass size={36} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="font-display mt-3 text-2xl font-bold text-foreground">
          Review Quest Awaits Your Form Level
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ask your tutor to set your Form level (Form 1 – Form 5) on your profile so we unlock the exact stations for your syllabus.
        </p>
      </section>
    );
  }

  if (map.status === "coming_soon" || !map.curriculum) {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-amber-300 bg-[#fffaf2] p-6 text-center shadow-xs sm:p-8">
        <Compass size={36} className="mx-auto text-primary" aria-hidden="true" />
        <h1 className="font-display mt-3 text-2xl font-bold text-foreground">
          Form {map.student.form} Review Quest — Station Map In Preparation
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your account is scoped to <strong>Form {map.student.form}</strong> so you only see material for your own year. Your tutor is preparing the stations for Form {map.student.form}.
        </p>
      </section>
    );
  }

  const { curriculum } = map;
  const activeChapter = activeChapterId
    ? curriculum.chapters.find((c) => c.id === activeChapterId) ?? null
    : null;

  // 3. Chapter Vertical Winding Trail View (image_2.png style)
  if (activeChapter) {
    const theme = THEMES[activeChapter.theme];
    const ThemeIcon = theme.Icon;
    // S-curve horizontal offsets on desktop (`left`, `center`, `right`, `center`)
    const offsets = [
      "sm:mr-auto sm:ml-4",
      "sm:mx-auto",
      "sm:ml-auto sm:mr-4",
      "sm:mx-auto",
    ];

    return (
      <div className="space-y-5">
        {/* Themed Chapter Wooden/Expedition Signboard */}
        <header className={`rounded-lg p-5 shadow-sm sm:p-6 ${theme.headerBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActiveChapterId(null)}
              className="gap-1.5"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              All Stations
            </Button>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-3 py-1">
                <CheckCircle2 size={14} aria-hidden="true" />
                {activeChapter.passedCount} / {activeChapter.totalCount} cleared
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-3 py-1">
                <Star size={14} className="fill-amber-300 text-amber-300" aria-hidden="true" />
                {activeChapter.stars} / {activeChapter.maxStars}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3.5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ThemeIcon size={26} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                Station {activeChapter.number} • {theme.label}
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {activeChapter.title}
              </h1>
              <p className="text-xs text-white/85 sm:text-sm">{activeChapter.titleMs}</p>
            </div>
          </div>
        </header>

        {error && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        {/* Top-to-Bottom Winding Checkpoint Trail */}
        <section
          aria-label={`Station ${activeChapter.number} checkpoint path`}
          className={`relative overflow-hidden rounded-lg border-2 p-4 sm:p-8 ${theme.boardBorder} ${theme.boardBg}`}
        >
          {/* Central vertical dashed spine visible behind the winding nodes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-10 bottom-10 left-1/2 -translate-x-1/2 border-l-4 border-dashed border-stone-400/50"
          />

          <ol className="relative z-10 mx-auto max-w-2xl space-y-5">
            {activeChapter.checkpoints.map((cp, idx) => {
              const offsetClass = offsets[idx % offsets.length];
              const isLoading = loadingCp === cp.checkpointId;
              const isCurrentTarget =
                cp.unlocked &&
                !cp.passed &&
                activeChapter.checkpoints.findIndex((x) => x.unlocked && !x.passed) === idx;

              return (
                <li key={cp.checkpointId} className={`w-full sm:max-w-md ${offsetClass}`}>
                  <button
                    type="button"
                    disabled={!cp.unlocked || isLoading}
                    onClick={() => startCheckpoint(cp.checkpointId)}
                    className={`group relative flex w-full cursor-pointer items-center gap-3.5 rounded-lg border-2 p-4 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed ${
                      !cp.unlocked
                        ? "border-stone-300 bg-stone-100/90 text-stone-500 opacity-85"
                        : cp.boss
                          ? cp.passed
                            ? "border-amber-500 bg-amber-50/95 shadow-sm hover:shadow-md"
                            : "border-amber-500 bg-white shadow-sm hover:bg-amber-50/60 hover:shadow-md"
                          : cp.passed
                            ? "border-emerald-500 bg-white shadow-xs hover:shadow-md"
                            : `${theme.nodeOpenBorder} ${theme.nodeOpenBg} shadow-sm hover:shadow-md`
                    } ${isCurrentTarget ? "ring-4 ring-amber-300/70" : ""}`}
                  >
                    {/* Left Medallion */}
                    <span
                      className={`inline-flex size-12 shrink-0 flex-col items-center justify-center rounded-full border-2 font-mono text-xs font-bold ${
                        !cp.unlocked
                          ? "border-stone-300 bg-stone-200 text-stone-500"
                          : cp.boss
                            ? "border-amber-500 bg-amber-400 text-amber-950"
                            : cp.passed
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-primary bg-primary text-primary-foreground"
                      }`}
                    >
                      {!cp.unlocked ? (
                        <Lock size={18} aria-hidden="true" />
                      ) : cp.boss ? (
                        <Crown size={20} aria-hidden="true" />
                      ) : cp.passed ? (
                        <CheckCircle2 size={20} aria-hidden="true" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </span>

                    {/* Checkpoint Copy */}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                            !cp.unlocked
                              ? "bg-stone-200 text-stone-600"
                              : cp.boss
                                ? "bg-amber-200 text-amber-950"
                                : `${theme.badgeBg} ${theme.badgeText}`
                          }`}
                        >
                          {cp.boss ? `BOSS ${cp.code}` : cp.code}
                        </span>
                        <span className="text-[11px] font-medium text-stone-600">
                          {cp.gameName}
                        </span>
                      </span>

                      <span className="mt-1 block text-sm font-bold leading-snug text-stone-900">
                        {cp.title}
                      </span>
                      <span className="block truncate text-xs text-stone-600">
                        {cp.titleMs}
                      </span>

                      <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {cp.unlocked ? (
                          <>
                            <MiniStars stars={cp.stars} />
                            <span className="text-xs font-semibold tabular-nums text-stone-700">
                              {cp.bestScore !== null
                                ? `Best ${cp.bestScore}% (${cp.attempts}×)`
                                : cp.inProgressAttemptId
                                  ? "In progress — resume"
                                  : "Ready • 5–8 min"}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-stone-500">
                            Locked — score ≥ {curriculum.passPercent}% on previous checkpoint
                          </span>
                        )}
                      </span>
                    </span>

                    {/* Action Indicator */}
                    {cp.unlocked && (
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        {isLoading ? (
                          <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Play size={16} aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    );
  }

  // 4. World Adventure Station Map View (image.png style)
  return (
    <div className="space-y-6">
      {/* Top Expedition Banner */}
      <header className="directory-hero">
        <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-100">
              <Sparkles size={13} aria-hidden="true" />
              Form {curriculum.form} • {curriculum.subject}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Review Quest Map
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/85">
              Clear each sub-chapter checkpoint with at least{" "}
              <strong>{curriculum.passPercent}%</strong> to unlock the path forward across every station.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-black/20 px-4 py-2.5 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-100">
                Checkpoints
              </div>
              <div className="text-xl font-bold tabular-nums">
                {curriculum.passedCheckpoints} / {curriculum.totalCheckpoints}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 px-4 py-2.5 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-100">
                Stars Earned
              </div>
              <div className="flex items-center gap-1.5 text-xl font-bold tabular-nums">
                <Star size={18} className="fill-amber-300 text-amber-300" aria-hidden="true" />
                {curriculum.totalStars} / {curriculum.maxStars}
              </div>
            </div>
          </div>
        </div>

        {curriculum.nextCheckpoint && (
          <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/15 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 text-sm text-white">
              <MapPin size={18} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span>
                Next up:{" "}
                <strong>
                  {curriculum.nextCheckpoint.code} {curriculum.nextCheckpoint.title}
                </strong>
              </span>
            </div>
            <button
              type="button"
              disabled={loadingCp === curriculum.nextCheckpoint.checkpointId}
              onClick={() => startCheckpoint(curriculum.nextCheckpoint!.checkpointId)}
              className="directory-quick-action cursor-pointer"
            >
              {loadingCp === curriculum.nextCheckpoint.checkpointId ? (
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Play size={15} aria-hidden="true" />
              )}
              Continue Quest
            </button>
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}

      {/* Illustrated Parchment Station Map Board */}
      <section
        aria-label="Chapter stations map"
        className="relative overflow-hidden rounded-lg border-4 border-[#b85a28] bg-[#fbf0d9] p-5 shadow-md sm:p-8"
      >
        {/* Subtle parchment inner stitching & decorative SVG dashed winding trail */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 rounded-md border-2 border-dashed border-[#c98a55]/55"
        />

        <div className="relative z-10 mb-6 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c98a55] bg-[#fff8ea] px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#7c3415]">
            <Compass size={14} aria-hidden="true" />
            {curriculum.chapters.length} Chapter Stations
          </span>
          <span className="text-xs font-medium text-[#7c3415]">
            Tap a station to view its checkpoint trail
          </span>
        </div>

        {/* Winding Station Grid connected by dashed path */}
        <div className="relative z-10 grid gap-6 md:grid-cols-2">
          {curriculum.chapters.map((ch, idx) => {
            const theme = THEMES[ch.theme];
            const StationIcon = STATION_ICONS[idx % STATION_ICONS.length];
            const pct = ch.totalCount
              ? Math.round((ch.passedCount / ch.totalCount) * 100)
              : 0;
            const stationStars: 0 | 1 | 2 | 3 =
              pct === 100 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;

            return (
              <div
                key={ch.id}
                className={`relative ${idx % 2 === 1 ? "md:mt-10" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setActiveChapterId(ch.id)}
                  className={`group flex w-full cursor-pointer flex-col justify-between rounded-lg border-2 p-5 text-left transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-ring ${
                    ch.unlocked
                      ? "border-[#b85a28] bg-[#fffbf2] shadow-sm hover:border-primary hover:bg-white hover:shadow-md"
                      : "border-stone-300 bg-stone-100/90 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-lg ${
                        ch.unlocked ? theme.headerBg : "bg-stone-300 text-stone-600"
                      }`}
                    >
                      {ch.unlocked ? (
                        <StationIcon size={24} aria-hidden="true" />
                      ) : (
                        <Lock size={22} aria-hidden="true" />
                      )}
                    </span>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          ch.completed
                            ? "bg-emerald-100 text-emerald-900"
                            : ch.unlocked
                              ? `${theme.badgeBg} ${theme.badgeText}`
                              : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {ch.completed
                          ? "Station Mastered"
                          : ch.unlocked
                            ? `Station ${ch.number} Open`
                            : `Station ${ch.number} Locked`}
                      </span>
                      <MiniStars stars={stationStars} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#9a3e1a]">
                      Bab {ch.number} • {theme.label}
                    </p>
                    <h2 className="font-display mt-0.5 text-xl font-bold text-stone-900">
                      {ch.title}
                    </h2>
                    <p className="text-xs font-medium text-stone-600">{ch.titleMs}</p>
                    <p className="mt-2 text-xs leading-relaxed text-stone-700">
                      {ch.blurb}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-amber-200/70 pt-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                      <span>
                        {ch.passedCount} of {ch.totalCount} checkpoints cleared
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        Enter Station
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {curriculum.passedCheckpoints === curriculum.totalCheckpoints &&
          curriculum.totalCheckpoints > 0 && (
            <div className="relative z-10 mt-8 flex items-center gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4 text-emerald-950">
              <Award size={28} className="shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <div className="font-bold">
                  All Form {curriculum.form} Stations Cleared!
                </div>
                <p className="text-xs">
                  Amazing work — replay any checkpoint anytime to aim for 3 stars and keep your recall sharp before exams.
                </p>
              </div>
            </div>
          )}
      </section>
    </div>
  );
}
