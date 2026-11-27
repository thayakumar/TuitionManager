"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  LoaderCircle,
  Lock,
  MapPin,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GamePlayer } from "./game-player";
import {
  Gem3D,
  IsometricIsland,
  StarTrio3D,
  TreasureChest3D,
} from "./quest-art";
import { questSfx, useQuestAudio } from "@/lib/review/sfx";
import type {
  ActiveSessionPayload,
  StudentMapPayload,
} from "@/lib/review/service";
import type { ThemeId } from "@/lib/review/types";

type BiomeVisual = {
  label: string;
  canvasClass: string;
  roadOuter: string;
  roadInner: string;
  badgeClass: string;
};

const BIOMES: Record<ThemeId, BiomeVisual> = {
  meadow: {
    label: "Emerald Meadow",
    canvasClass:
      "border-emerald-700 bg-gradient-to-b from-[#bbf7d0] via-[#86efac] to-[#4ade80]",
    roadOuter: "#854d0e",
    roadInner: "#d97706",
    badgeClass: "bg-emerald-800 text-emerald-50",
  },
  lagoon: {
    label: "Coral Lagoon",
    canvasClass:
      "border-cyan-800 bg-gradient-to-b from-[#bae6fd] via-[#67e8f9] to-[#fde68a]",
    roadOuter: "#0e7490",
    roadInner: "#fef08a",
    badgeClass: "bg-cyan-900 text-cyan-50",
  },
  frost: {
    label: "Glacier Ridge",
    canvasClass:
      "border-sky-800 bg-gradient-to-b from-[#dbeafe] via-[#e0f2fe] to-[#bae6fd]",
    roadOuter: "#1d4ed8",
    roadInner: "#93c5fd",
    badgeClass: "bg-sky-900 text-sky-50",
  },
  candy: {
    label: "Amber Workshop",
    canvasClass:
      "border-orange-800 bg-gradient-to-b from-[#ffedd5] via-[#fed7aa] to-[#fdba74]",
    roadOuter: "#7c2d12",
    roadInner: "#ea580c",
    badgeClass: "bg-orange-900 text-orange-50",
  },
  desert: {
    label: "Sunstone Dunes",
    canvasClass:
      "border-amber-800 bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#fcd34d]",
    roadOuter: "#78350f",
    roadInner: "#d97706",
    badgeClass: "bg-amber-900 text-amber-50",
  },
  volcano: {
    label: "Ember Summit",
    canvasClass:
      "border-red-900 bg-gradient-to-b from-[#fee2e2] via-[#fecaca] to-[#fca5a5]",
    roadOuter: "#7f1d1d",
    roadInner: "#dc2626",
    badgeClass: "bg-red-950 text-red-50",
  },
};

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
  const { muted, toggleMute } = useQuestAudio();

  async function refreshMap() {
    try {
      const res = await fetch(`/api/review/${studentId}?viewer=student`, {
        cache: "no-store",
      });
      if (res.ok) {
        setMap((await res.json()) as StudentMapPayload);
      }
    } catch {
      // Keep last known map state if offline momentarily
    }
  }

  async function startCheckpoint(checkpointId: string, forceRestart = false) {
    questSfx.levelStart();
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
    questSfx.tap();
    setSession(null);
    await refreshMap();
  }

  // 1. Active Game Arena
  if (session) {
    return (
      <GamePlayer
        studentId={studentId}
        session={session}
        muted={muted}
        onToggleMute={toggleMute}
        onExitToTrail={handleExitPlayer}
        onStartCheckpoint={startCheckpoint}
      />
    );
  }

  // 2. Unset or Coming-Soon Form States
  if (map.status === "unset_form") {
    return (
      <section className="quest-parchment-board mx-auto max-w-xl p-7 text-center sm:p-9">
        <Compass size={40} className="mx-auto text-[#9a3e1a]" aria-hidden="true" />
        <h1 className="font-display mt-3 text-2xl font-bold text-stone-900">
          Your Adventure Map Awaits!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Ask your tutor to set your Form level (Form 1 – Form 5) so your island stations unlock.
        </p>
      </section>
    );
  }

  if (map.status === "coming_soon" || !map.curriculum) {
    return (
      <section className="quest-parchment-board mx-auto max-w-xl p-7 text-center sm:p-9">
        <Compass size={40} className="mx-auto text-[#9a3e1a]" aria-hidden="true" />
        <h1 className="font-display mt-3 text-2xl font-bold text-stone-900">
          Form {map.student.form} World Map — Under Construction
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Your account is locked to <strong>Form {map.student.form}</strong>. Your tutor is preparing the Form {map.student.form} island stations!
        </p>
      </section>
    );
  }

  const { curriculum } = map;
  const xpGems = curriculum.totalStars * 50 + curriculum.passedCheckpoints * 100;
  const playerLevel = curriculum.passedCheckpoints + 1;
  const overallPct = curriculum.totalCheckpoints
    ? Math.round((curriculum.passedCheckpoints / curriculum.totalCheckpoints) * 100)
    : 0;

  const activeChapter = activeChapterId
    ? curriculum.chapters.find((c) => c.id === activeChapterId) ?? null
    : null;

  // =========================================================================
  // 3. CHAPTER 3D BIOME WINDING TRAIL VIEW (inspired directly by image_2.png)
  // =========================================================================
  if (activeChapter) {
    const biome = BIOMES[activeChapter.theme];
    // S-curve zig-zag positions along the winding trail!
    const laneClasses = [
      "sm:ml-6 sm:mr-auto",
      "sm:mx-auto",
      "sm:mr-6 sm:ml-auto",
      "sm:mx-auto",
    ];
    const currentOpenIdx = activeChapter.checkpoints.findIndex(
      (c) => c.unlocked && !c.passed,
    );

    return (
      <div className="space-y-5">
        {/* 3D Hanging Wooden Signboard Header (like top plaque in image_2.png!) */}
        <header className="quest-wood-signboard p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                questSfx.tap();
                setActiveChapterId(null);
              }}
              className="quest-3d-btn quest-3d-btn-gold inline-flex cursor-pointer items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              World Map
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/30 px-3 py-1 text-xs font-bold text-amber-100">
                <CheckCircle2 size={14} className="text-emerald-300" aria-hidden="true" />
                {activeChapter.passedCount} / {activeChapter.totalCount} Cleared
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/30 px-3 py-1 text-xs font-bold text-amber-100">
                <StarTrio3D
                  stars={
                    activeChapter.passedCount === activeChapter.totalCount
                      ? 3
                      : activeChapter.passedCount > 0
                        ? 2
                        : 0
                  }
                  size={14}
                />
                <span>
                  {activeChapter.stars} / {activeChapter.maxStars}
                </span>
              </span>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Unmute game sounds" : "Mute game sounds"}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-amber-200/40 bg-black/30 text-amber-100 hover:bg-black/45"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-200">
              Station {activeChapter.number} • {biome.label}
            </p>
            <h1 className="font-display mt-0.5 text-2xl font-extrabold tracking-tight text-white drop-shadow-xs sm:text-3xl">
              {activeChapter.title}
            </h1>
            <p className="text-xs font-medium text-amber-100/90 sm:text-sm">
              {activeChapter.titleMs}
            </p>
          </div>
        </header>

        {error && (
          <p role="alert" className="rounded-lg border-2 border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-900">
            {error}
          </p>
        )}

        {/* Illustrated Biome Winding Path Stage */}
        <section
          aria-label={`Station ${activeChapter.number} checkpoint trail`}
          className={`relative overflow-hidden rounded-2xl border-4 p-5 shadow-lg sm:p-9 ${biome.canvasClass}`}
        >
          {/* Decorative Winding Road / River Spine */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-8 left-1/2 w-12 -translate-x-1/2 rounded-full opacity-45"
            style={{
              background: `repeating-linear-gradient(180deg, ${biome.roadInner} 0 18px, ${biome.roadOuter} 18px 32px)`,
            }}
          />

          <ol className="relative z-10 mx-auto max-w-2xl space-y-6">
            {activeChapter.checkpoints.map((cp, idx) => {
              const lane = laneClasses[idx % laneClasses.length];
              const isCurrent = idx === currentOpenIdx;
              const isLoading = loadingCp === cp.checkpointId;

              const puckClass = !cp.unlocked
                ? "quest-puck-locked"
                : isCurrent
                  ? "quest-puck-current"
                  : "quest-puck-open";

              return (
                <li key={cp.checkpointId} className={`w-full sm:max-w-[430px] ${lane}`}>
                  <button
                    type="button"
                    disabled={!cp.unlocked || isLoading}
                    onClick={() => startCheckpoint(cp.checkpointId)}
                    className={`quest-3d-btn group relative flex w-full cursor-pointer items-center gap-3.5 p-3.5 text-left focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed sm:p-4 ${
                      !cp.unlocked
                        ? "border-stone-400 bg-stone-200/90 text-stone-600 opacity-90"
                        : cp.boss
                          ? "border-amber-600 bg-gradient-to-b from-[#fffbeb] to-[#fef3c7]"
                          : "border-stone-300 bg-white/95"
                    }`}
                  >
                    {/* Bouncing Player Location Marker on Active Checkpoint! */}
                    {isCurrent && (
                      <span className="quest-pin-marker absolute -top-4 left-5 inline-flex items-center gap-1 rounded-full border-2 border-amber-900 bg-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm">
                        <MapPin size={11} aria-hidden="true" />
                        You Are Here
                      </span>
                    )}

                    {/* Left 3D Stepping-Stone Puck OR 3D Boss Treasure Chest */}
                    {cp.boss ? (
                      <span className="shrink-0">
                        <TreasureChest3D
                          state={
                            !cp.unlocked
                              ? "locked"
                              : cp.passed
                                ? "opened"
                                : "ready"
                          }
                          size={58}
                        />
                      </span>
                    ) : (
                      <span
                        className={`inline-flex size-14 shrink-0 flex-col items-center justify-center rounded-full font-mono text-base font-extrabold ${puckClass}`}
                      >
                        {!cp.unlocked ? (
                          <Lock size={20} aria-hidden="true" />
                        ) : cp.passed ? (
                          <CheckCircle2 size={22} aria-hidden="true" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </span>
                    )}

                    {/* Checkpoint Title, Game Mode & 3D Stars */}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-extrabold ${
                            !cp.unlocked
                              ? "bg-stone-300 text-stone-700"
                              : cp.boss
                                ? "bg-amber-500 text-amber-950"
                                : biome.badgeClass
                          }`}
                        >
                          {cp.boss ? `BOSS ${cp.code}` : cp.code}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                          {cp.gameName}
                        </span>
                      </span>

                      <span className="mt-1 block text-sm font-extrabold leading-snug text-stone-900 sm:text-base">
                        {cp.title}
                      </span>
                      <span className="block truncate text-xs text-stone-600">
                        {cp.titleMs}
                      </span>

                      <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {cp.unlocked ? (
                          <>
                            <StarTrio3D stars={cp.stars} size={17} />
                            <span className="text-xs font-extrabold tabular-nums text-stone-800">
                              {cp.bestScore !== null
                                ? `Best ${cp.bestScore}%`
                                : cp.inProgressAttemptId
                                  ? "Resume Quest"
                                  : "Start! (5–8m)"}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold text-stone-600">
                            Score ≥ {curriculum.passPercent}% above to unlock
                          </span>
                        )}
                      </span>
                    </span>

                    {/* 3D Play Pill */}
                    {cp.unlocked && (
                      <span className="quest-3d-btn-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full">
                        {isLoading ? (
                          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                        ) : cp.boss ? (
                          <Crown size={18} aria-hidden="true" />
                        ) : (
                          <Play size={17} aria-hidden="true" />
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

  // =========================================================================
  // 4. 3D WORLD ADVENTURE STATION MAP (inspired directly by image.png!)
  // =========================================================================
  return (
    <div className="quest-world-stage space-y-5 sm:p-6">
      {/* Top Game HUD Bar (Player Level + XP Bar on Left, Stars + Gems + Audio on Right) */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        {/* Player Level Shield + XP Progress Bar */}
        <div className="flex items-center gap-2.5 rounded-full border-2 border-cyan-950/35 bg-cyan-950/55 px-3 py-1.5 text-white backdrop-blur-xs">
          <span className="inline-flex size-9 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-b from-amber-400 to-orange-600 font-mono text-xs font-extrabold text-white shadow-xs">
            Lv.{playerLevel}
          </span>
          <div className="min-w-36 pr-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wide text-cyan-100">
              <span>{map.student.name.split(" ")[0]}</span>
              <span>{overallPct}%</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cyan-950/80 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-400 transition-[width] duration-300"
                style={{ width: `${Math.max(6, overallPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Counters: Stars, Gems XP, and Sound FX Switch */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/60 bg-sky-900/65 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs"
            title="Total stars earned across all checkpoints"
          >
            <StarTrio3D stars={3} size={15} />
            <span className="ml-1 font-mono text-sm tabular-nums">
              {curriculum.totalStars} / {curriculum.maxStars}
            </span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/60 bg-sky-900/65 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs"
            title="Quest Gems earned from checkpoints & stars"
          >
            <Gem3D size={18} />
            <span className="font-mono text-sm tabular-nums">{xpGems}</span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
            title={muted ? "Sound FX muted — tap to turn on" : "Sound FX on — tap to mute"}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white/65 bg-sky-900/70 text-white shadow-xs hover:bg-sky-900"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="relative z-10 rounded-lg border-2 border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-900">
          {error}
        </p>
      )}

      {/* Center 3D Parchment Map Board with Green Ribbon Crown */}
      <div className="relative z-10 pt-4">
        <div className="flex justify-center">
          <div className="quest-ribbon-banner -mb-5 z-20 text-xs sm:text-sm">
            <Compass size={16} aria-hidden="true" />
            Form {curriculum.form} • {curriculum.subject} Quest
          </div>
        </div>

        <section
          aria-label="Adventure island stations"
          className="quest-parchment-board px-4 pt-10 pb-7 sm:px-8 sm:pt-12 sm:pb-9"
        >
          {/* Brass Corner Rivets & Dashed Cartography Border */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-[#b46934]/55"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 left-4 size-3.5 rounded-full border-2 border-[#5c280e] bg-amber-400 shadow-2xs"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 right-4 size-3.5 rounded-full border-2 border-[#5c280e] bg-amber-400 shadow-2xs"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-4 size-3.5 rounded-full border-2 border-[#5c280e] bg-amber-400 shadow-2xs"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 bottom-4 size-3.5 rounded-full border-2 border-[#5c280e] bg-amber-400 shadow-2xs"
          />

          {/* Winding Dashed Map Path SVG Behind the Islands */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 500"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-8 hidden h-[calc(100%-4rem)] w-[calc(100%-4rem)] md:block"
          >
            {/* Subtle Hand-Sketched Mountain Contours on Parchment */}
            <path
              d="M350 95 L380 55 L410 95 M392 95 L418 65 L445 95 M360 400 L395 355 L430 400"
              fill="none"
              stroke="#c99963"
              strokeWidth="2"
              opacity="0.45"
            />
            {/* Bold Dashed Pirate/Adventure Trail Connecting Stations 1 → 2 → 3 → 4 */}
            <path
              d="M 200 130 C 370 60, 440 190, 600 155 C 680 250, 140 270, 210 375 C 360 455, 470 340, 600 390"
              fill="none"
              stroke="#7c3415"
              strokeWidth="6"
              strokeDasharray="14 12"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>

          {/* Continue Next Checkpoint Hero Pill */}
          {curriculum.nextCheckpoint && (
            <div className="relative z-10 mx-auto mb-7 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#c2783e] bg-[#fffaf0]/95 px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950">
                  <Flame size={17} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9a3e1a]">
                    Current Quest Target
                  </div>
                  <strong className="text-stone-900">
                    {curriculum.nextCheckpoint.code} — {curriculum.nextCheckpoint.title}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                disabled={loadingCp === curriculum.nextCheckpoint.checkpointId}
                onClick={() =>
                  startCheckpoint(curriculum.nextCheckpoint!.checkpointId)
                }
                className="quest-3d-btn quest-3d-btn-primary inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-extrabold sm:text-sm"
              >
                {loadingCp === curriculum.nextCheckpoint.checkpointId ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play size={15} aria-hidden="true" />
                )}
                Jump Straight In!
              </button>
            </div>
          )}

          {/* Floating 3D Isometric Station Islands Grid */}
          <div className="relative z-10 grid gap-7 md:grid-cols-2">
            {curriculum.chapters.map((ch, idx) => {
              const pct = ch.totalCount
                ? Math.round((ch.passedCount / ch.totalCount) * 100)
                : 0;
              const stationStars: 0 | 1 | 2 | 3 =
                pct === 100 ? 3 : pct >= 55 ? 2 : pct > 0 ? 1 : 0;

              return (
                <div
                  key={ch.id}
                  className={idx % 2 === 1 ? "md:mt-9" : ""}
                >
                  <button
                    type="button"
                    onClick={() => {
                      questSfx.stationOpen();
                      setActiveChapterId(ch.id);
                    }}
                    className={`quest-station-card group flex w-full cursor-pointer flex-col items-center p-5 text-center focus-visible:outline-2 focus-visible:outline-ring ${
                      !ch.unlocked ? "opacity-90" : ""
                    }`}
                  >
                    {/* Station Ribbon Pill */}
                    <div className="flex w-full items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                          ch.completed
                            ? "bg-emerald-600 text-white"
                            : ch.unlocked
                              ? "bg-[#9a3e1a] text-amber-100"
                              : "bg-stone-300 text-stone-700"
                        }`}
                      >
                        Station {ch.number}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#7c3415]">
                        {ch.passedCount}/{ch.totalCount} lvls
                      </span>
                    </div>

                    {/* 3D Floating Isometric Island SVG */}
                    <div className="my-1">
                      <IsometricIsland theme={ch.theme} locked={!ch.unlocked} />
                    </div>

                    {/* 3D Gold Star Trio right below the Island (just like image.png!) */}
                    <div className="-mt-1 mb-2">
                      <StarTrio3D stars={stationStars} size={23} />
                    </div>

                    <h2 className="font-display text-lg font-extrabold text-stone-900 sm:text-xl">
                      Bab {ch.number}: {ch.title}
                    </h2>
                    <p className="text-xs font-semibold text-[#8c4319]">
                      {ch.titleMs}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-stone-600">
                      {ch.blurb}
                    </p>

                    <div className="mt-3.5 flex w-full items-center justify-between gap-3 border-t border-amber-300/60 pt-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-amber-200/75 p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#b82f25] group-hover:translate-x-0.5">
                        {ch.unlocked ? "Explore" : "Preview"}
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {curriculum.passedCheckpoints === curriculum.totalCheckpoints &&
            curriculum.totalCheckpoints > 0 && (
              <div className="relative z-10 mt-8 flex items-center gap-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
                <Award size={30} className="shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <div className="font-extrabold">
                    All Form {curriculum.form} Island Stations Conquered!
                  </div>
                  <p className="text-xs">
                    Incredible! Replay any island station anytime to collect every 3-star crown before your exams.
                  </p>
                </div>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
