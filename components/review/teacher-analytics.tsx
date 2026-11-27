"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Unlock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeacherStudentReport } from "@/lib/review/service";
import type { FormLevel } from "@/lib/review/types";

function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const sec = Math.max(1, Math.round(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type ItemFilter = "all" | "unresolved" | "retries" | "blindspots";

export function TeacherStudentAnalytics({
  initialReport,
}: {
  initialReport: TeacherStudentReport;
}) {
  const [report, setReport] = useState<TeacherStudentReport>(initialReport);
  const [selectedForm, setSelectedForm] = useState<FormLevel>(
    initialReport.student.assignedForm ?? 1,
  );
  const [savingForm, setSavingForm] = useState(false);
  const [busyUnlock, setBusyUnlock] = useState<string | null>(null);
  const [loadingFormTab, setLoadingFormTab] = useState<FormLevel | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const studentId = report.student.id;

  async function reloadReport(form?: FormLevel | null) {
    const q = form ? `&form=${form}` : "";
    const res = await fetch(`/api/review/${studentId}?viewer=admin${q}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as TeacherStudentReport & { error?: string };
    if (!res.ok) throw new Error(data.error || "Could not load report.");
    setReport(data);
  }

  async function handleSaveStudentForm() {
    setSavingForm(true);
    setError(null);
    try {
      const res = await fetch(`/api/review/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_form", formLevel: selectedForm }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update Form.");
      await reloadReport(selectedForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save Form.");
    } finally {
      setSavingForm(false);
    }
  }

  async function handleSwitchViewingForm(form: FormLevel) {
    setLoadingFormTab(form);
    setError(null);
    try {
      await reloadReport(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch Form view.");
    } finally {
      setLoadingFormTab(null);
    }
  }

  async function handleToggleUnlock(checkpointId: string, unlocked: boolean) {
    if (!report.viewingForm) return;
    setBusyUnlock(checkpointId);
    setError(null);
    try {
      const res = await fetch(`/api/review/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock",
          formLevel: report.viewingForm,
          checkpointId,
          unlocked,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update lock.");
      await reloadReport(report.viewingForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not toggle checkpoint lock.");
    } finally {
      setBusyUnlock(null);
    }
  }

  const filteredItems = report.items.filter((it) => {
    if (itemFilter === "unresolved") return !it.currentlyMastered;
    if (itemFilter === "retries")
      return it.wrongAttempts > 0 || it.totalAttempts > 1;
    if (itemFilter === "blindspots") return it.blindSpot;
    return true;
  });

  return (
    <div className="space-y-7">
      {/* Top Breadcrumb + Student Form Assignment Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-xs lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/review"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              All Students Review Quest
            </Link>
            <span>•</span>
            <Link
              href={`/students/${studentId}`}
              className="hover:text-foreground hover:underline"
            >
              Student Profile
            </Link>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {report.student.name} — Learner Intelligence
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Current profile level:{" "}
            <strong className="text-foreground">
              {report.student.gradeLevel || "Not set"}
            </strong>
            {report.student.assignedForm
              ? ` (Scoped to Form ${report.student.assignedForm} map)`
              : " (Assign Form 1–5 below to activate their Review Quest)"}
          </p>
        </div>

        {/* Assign / Promote Student Form */}
        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <label
              htmlFor="student-form-select"
              className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Assigned Form (Year Promotion)
            </label>
            <select
              id="student-form-select"
              value={selectedForm}
              onChange={(e) => setSelectedForm(Number(e.target.value) as FormLevel)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {[1, 2, 3, 4, 5].map((f) => (
                <option key={f} value={f}>
                  Form {f} {report.availableForms.includes(f as FormLevel) ? "(Ready)" : "(Coming soon)"}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={savingForm || selectedForm === report.student.assignedForm}
            onClick={handleSaveStudentForm}
            className="gap-1.5"
          >
            {savingForm && (
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            )}
            Set to Form {selectedForm}
          </Button>
        </div>
      </div>

      {/* Multi-Year Form History Switcher (if student has history across multiple forms) */}
      {report.historicalForms.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Inspect Form History:
          </span>
          {report.historicalForms.map((f) => {
            const active = report.viewingForm === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => handleSwitchViewingForm(f)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {loadingFormTab === f ? "Loading…" : `Form ${f}`}
                {report.student.assignedForm === f ? " (Current)" : " (Archived)"}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}

      {!report.curriculumReady || !report.overview ? (
        <section className="rounded-lg border border-amber-300 bg-[#fffaf2] p-6 text-center">
          <Compass size={32} className="mx-auto text-primary" aria-hidden="true" />
          <h2 className="font-display mt-2 text-lg font-bold text-foreground">
            {report.viewingForm
              ? `Form ${report.viewingForm} Question Bank Not Yet Published`
              : "Assign a Form Level Above"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Form 1 Asas Sains Komputer (all 4 chapters, 42 checkpoints) is live right now. Set the student to Form 1 above to view and unlock checkpoints.
          </p>
        </section>
      ) : (
        <>
          {/* 1. Executive KPI Strip */}
          <section aria-label="Key learning metrics" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="kpi-hero-surface rounded-lg border border-border p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Checkpoints Mastered</span>
                <Target size={16} className="text-primary" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {report.overview.passedCheckpoints} / {report.overview.totalCheckpoints}{" "}
                <span className="text-sm font-semibold text-primary">
                  ({report.overview.masteryPct}%)
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true" />
                {report.overview.totalStars} / {report.overview.maxStars} stars earned
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Accuracy & 1st-Try Pass</span>
                <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {report.overview.overallItemAccuracyPct !== null
                  ? `${report.overview.overallItemAccuracyPct}%`
                  : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                1st-try checkpoint pass:{" "}
                <strong className="text-foreground">
                  {report.overview.firstTryPassRatePct !== null
                    ? `${report.overview.firstTryPassRatePct}%`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Retry Learning Gain</span>
                <TrendingUp size={16} className="text-sky-600" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {report.overview.avgNormalisedGainPct !== null
                  ? `+${report.overview.avgNormalisedGainPct}%`
                  : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Across {report.overview.completedAttempts} completed round
                {report.overview.completedAttempts === 1 ? "" : "s"}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Active Study Time</span>
                <Clock size={16} className="text-amber-700" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {fmtDuration(report.overview.totalStudyTimeMs)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Avg per checkpoint:{" "}
                <strong className="text-foreground">
                  {fmtDuration(report.overview.avgCheckpointTimeMs)}
                </strong>
              </div>
            </div>
          </section>

          {/* 2. Tutor Next-Step Decision Brief + Confidence Calibration */}
          <div className="grid gap-5 lg:grid-cols-12">
            <section
              aria-labelledby="tutor-decisions-heading"
              className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-7"
            >
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-primary" aria-hidden="true" />
                <h2 id="tutor-decisions-heading" className="text-base font-bold text-foreground">
                  Recommended Next Teaching Moves
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Automatically synthesised from retries, misconception tags, confidence blind spots, and spacing intervals.
              </p>

              {report.recommendations.length === 0 ? (
                <p className="mt-4 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
                  No attempts recorded yet for Form {report.viewingForm}. Once {report.student.name} completes their first checkpoint, concrete teaching recommendations will appear here.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.recommendations.map((rec, i) => {
                    const style =
                      rec.severity === "critical"
                        ? "border-red-300 bg-red-50/70 text-red-950"
                        : rec.severity === "focus"
                          ? "border-amber-300 bg-amber-50/70 text-amber-950"
                          : rec.severity === "spaced"
                            ? "border-sky-300 bg-sky-50/70 text-sky-950"
                            : "border-emerald-300 bg-emerald-50/70 text-emerald-950";
                    return (
                      <li key={i} className={`rounded-md border p-3.5 ${style}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold">{rec.title}</span>
                          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {rec.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed opacity-90">
                          {rec.detail}
                        </p>
                        <p className="mt-2 text-xs font-semibold">
                          Next step: {rec.action}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Metacognitive Confidence Calibration Matrix */}
            <section
              aria-labelledby="calibration-heading"
              className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-primary" aria-hidden="true" />
                <h2 id="calibration-heading" className="text-base font-bold text-foreground">
                  Learner Confidence vs Reality
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Separates solid mastery from lucky guesses and entrenched blind spots.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="text-xs font-bold text-emerald-900">
                    Solid Mastery
                  </div>
                  <div className="text-[11px] text-emerald-800">Sure & Correct</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-950">
                    {report.overview.calibration.sureCorrect}
                  </div>
                </div>

                <div className="rounded-md border border-red-200 bg-red-50/70 p-3">
                  <div className="text-xs font-bold text-red-900">
                    Blind Spots
                  </div>
                  <div className="text-[11px] text-red-800">Sure & WRONG</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-red-950">
                    {report.overview.calibration.sureWrong}
                  </div>
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <div className="text-xs font-bold text-amber-900">
                    Fragile / Tentative
                  </div>
                  <div className="text-[11px] text-amber-800">Unsure & Correct</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-amber-950">
                    {report.overview.calibration.unsureCorrect}
                  </div>
                </div>

                <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                  <div className="text-xs font-bold text-stone-800">
                    Aware Gap
                  </div>
                  <div className="text-[11px] text-stone-600">Unsure & Wrong</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-stone-900">
                    {report.overview.calibration.unsureWrong}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                <strong>Why this matters:</strong> Students who mark{" "}
                <em>&ldquo;I&apos;m sure&rdquo;</em> on a wrong answer believe a faulty rule and need a direct counter-example; tentative right answers benefit from one quick verbal &ldquo;explain why&rdquo;.
              </p>
            </section>
          </div>

          {/* 3. Cognitive Skill Profile + Misconceptions Detected */}
          <div className="grid gap-5 lg:grid-cols-12">
            <section
              aria-labelledby="skills-heading"
              className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-6"
            >
              <h2 id="skills-heading" className="text-base font-bold text-foreground">
                Cognitive Skill Breakdown
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Compare recall vs tracing, debugging, and problem analysis.
              </p>

              <div className="mt-4 space-y-3">
                {report.skills.map((sk) => {
                  const pct = sk.accuracyPct ?? 0;
                  return (
                    <div key={sk.skill} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-foreground">{sk.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {sk.attempts > 0 ? (
                            <>
                              <strong className="text-foreground">{pct}%</strong> (1st try{" "}
                              {sk.firstTryAccuracyPct ?? 0}% • {sk.attempts} q • avg{" "}
                              {fmtDuration(sk.avgTimeMs)})
                            </>
                          ) : (
                            "No data yet"
                          )}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-[width] duration-200 ${
                            sk.attempts === 0
                              ? "bg-transparent"
                              : pct >= 80
                                ? "bg-emerald-600"
                                : pct >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${sk.attempts ? pct : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              aria-labelledby="misconceptions-heading"
              className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-6"
            >
              <h2 id="misconceptions-heading" className="text-base font-bold text-foreground">
                Diagnostic Misconceptions Detected
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Specific mental-model traps triggered by the student&apos;s wrong choices or inputs.
              </p>

              {report.misconceptions.length === 0 ? (
                <p className="mt-4 rounded-md bg-muted/50 p-4 text-xs text-muted-foreground">
                  No tagged misconceptions triggered yet.
                </p>
              ) : (
                <ul className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {report.misconceptions.map((m) => (
                    <li
                      key={m.tag}
                      className="rounded-md border border-border bg-background p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-primary">
                          {m.tag}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {m.unresolvedItems > 0 && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-900">
                              {m.unresolvedItems} unresolved
                            </span>
                          )}
                          {m.resolvedItems > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                              {m.resolvedItems} self-corrected
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            ({m.occurrences}×)
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 leading-relaxed text-foreground">
                        {m.description}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {m.chapterTitle} • Sub-chapters: {m.affectedCodes.join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* 4. Station & Checkpoint Matrix + Tutor Unlock Controls */}
          <section
            aria-labelledby="stations-matrix-heading"
            className="rounded-lg border border-border bg-card p-5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="stations-matrix-heading" className="text-base font-bold text-foreground">
                  Station & Checkpoint Progress (Form {report.viewingForm})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Sequential 80% gate is active. Use <strong>Tutor Unlock</strong> if {report.student.name} needs to jump ahead to a later chapter now.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-5">
              {report.chapters.map((ch) => (
                <div key={ch.id} className="rounded-lg border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Station {ch.number}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">
                        {ch.title}
                        {ch.titleMs !== ch.title && (
                          <>
                            {" "}
                            — <span className="font-normal text-muted-foreground">{ch.titleMs}</span>
                          </>
                        )}
                      </h3>
                    </div>
                    <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold tabular-nums">
                      {ch.passedCount} / {ch.totalCount} mastered
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {ch.checkpoints.map((cp) => (
                      <div key={cp.checkpointId} className="p-3.5 text-xs">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono font-bold text-primary">
                                {cp.boss ? `BOSS ${cp.code}` : cp.code}
                              </span>
                              <span className="font-semibold text-foreground">
                                {cp.title}
                              </span>
                              <span className="text-muted-foreground">({cp.gameName})</span>
                              {cp.passed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                                  <CheckCircle2 size={12} aria-hidden="true" />
                                  Mastered ({cp.stars}★)
                                </span>
                              ) : cp.unlocked ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                  Unlocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                                  <Lock size={11} aria-hidden="true" />
                                  Locked
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {cp.objective}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 tabular-nums">
                            <div>
                              <div className="text-[11px] text-muted-foreground">Attempts</div>
                              <div className="font-bold text-foreground">{cp.attempts}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-muted-foreground">1st → Best</div>
                              <div className="font-bold text-foreground">
                                {cp.firstScore !== null ? `${cp.firstScore}% → ${cp.bestScore}%` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-muted-foreground">Avg Time</div>
                              <div className="font-bold text-foreground">
                                {fmtDuration(cp.avgDurationMs)}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busyUnlock === cp.checkpointId}
                              onClick={() =>
                                handleToggleUnlock(cp.checkpointId, !cp.tutorUnlocked)
                              }
                              className="h-7 gap-1 px-2.5 text-xs"
                            >
                              {busyUnlock === cp.checkpointId ? (
                                <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                              ) : cp.tutorUnlocked ? (
                                <Lock size={12} aria-hidden="true" />
                              ) : (
                                <Unlock size={12} aria-hidden="true" />
                              )}
                              {cp.tutorUnlocked ? "Revoke Unlock" : "Tutor Unlock"}
                            </Button>
                          </div>
                        </div>

                        {cp.attemptHistory.length > 0 && (
                          <details className="mt-2.5 rounded-md bg-muted/40 px-3 py-2">
                            <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                              View {cp.attemptHistory.length} attempt log
                              {cp.attemptHistory.length === 1 ? "" : "s"} (last played{" "}
                              {fmtDate(cp.lastPlayedAt)})
                            </summary>
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border text-muted-foreground">
                                    <th className="py-1 pr-3">#</th>
                                    <th className="py-1 pr-3">Status</th>
                                    <th className="py-1 pr-3">Score</th>
                                    <th className="py-1 pr-3">Points</th>
                                    <th className="py-1 pr-3">Time Taken</th>
                                    <th className="py-1">Completed</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cp.attemptHistory.map((a) => (
                                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                                      <td className="py-1.5 pr-3 font-mono font-semibold">
                                        #{a.attemptNumber}
                                      </td>
                                      <td className="py-1.5 pr-3 capitalize">{a.status}</td>
                                      <td className="py-1.5 pr-3 font-bold tabular-nums">
                                        {a.scorePct !== null ? `${a.scorePct}%` : "—"}
                                        {a.passed ? " (Pass)" : ""}
                                      </td>
                                      <td className="py-1.5 pr-3 tabular-nums">
                                        {a.pointsEarned} / {a.pointsMax}
                                      </td>
                                      <td className="py-1.5 pr-3 tabular-nums">
                                        {fmtDuration(a.durationMs)}
                                      </td>
                                      <td className="py-1.5 text-muted-foreground">
                                        {fmtDate(a.completedAt ?? a.startedAt)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Question-by-Question Struggle & Retries Explorer */}
          <section
            aria-labelledby="question-drilldown-heading"
            className="rounded-lg border border-border bg-card p-5 shadow-xs"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 id="question-drilldown-heading" className="text-base font-bold text-foreground">
                  Question-Level Learning Log ({filteredItems.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Inspect exact wrong answers, how many tries each question took to master, time-to-correct, and confidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter questions">
                {(
                  [
                    ["all", `All (${report.items.length})`],
                    [
                      "unresolved",
                      `Still Wrong (${report.items.filter((i) => !i.currentlyMastered).length})`,
                    ],
                    [
                      "retries",
                      `Took Retries (${report.items.filter((i) => i.wrongAttempts > 0 || i.totalAttempts > 1).length})`,
                    ],
                    [
                      "blindspots",
                      `Blind Spots (${report.items.filter((i) => i.blindSpot).length})`,
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setItemFilter(key)}
                    className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                      itemFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <p className="mt-4 rounded-md bg-muted/50 p-4 text-xs text-muted-foreground">
                No questions match this filter yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredItems.slice(0, 60).map((it) => (
                  <article
                    key={it.itemId}
                    className="rounded-md border border-border bg-background p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono font-bold text-primary">
                          {it.checkpointCode}
                        </span>
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 capitalize text-muted-foreground">
                          {it.skill}
                        </span>
                        {it.currentlyMastered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            {it.attemptsToFirstCorrect === 1
                              ? "Right on 1st try"
                              : `Mastered on try #${it.attemptsToFirstCorrect}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-900">
                            <XCircle size={12} aria-hidden="true" />
                            Unresolved ({it.wrongAttempts} wrong)
                          </span>
                        )}
                        {it.blindSpot && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 font-bold text-white">
                            <AlertTriangle size={11} aria-hidden="true" />
                            Sure & Wrong
                          </span>
                        )}
                        {it.fragile && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                            <HelpCircle size={11} aria-hidden="true" />
                            Unsure
                          </span>
                        )}
                      </div>

                      <span className="tabular-nums text-muted-foreground">
                        {it.totalAttempts === 1
                          ? `Time: ${fmtDuration(it.latestTimeMs)}`
                          : `Time: ${fmtDuration(it.firstTimeMs)} → ${fmtDuration(it.latestTimeMs)}`}
                      </span>
                    </div>

                    <p className="mt-2 font-medium leading-relaxed text-foreground">
                      {it.prompt}
                    </p>
                    {it.code && (
                      <pre className="mt-2 overflow-x-auto rounded-sm bg-stone-900 p-2.5 font-mono text-[11px] text-amber-100">
                        <code>{it.code}</code>
                      </pre>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        <strong>Solution:</strong>{" "}
                        <span className="font-mono text-foreground">{it.solution}</span>
                      </span>
                      {it.misconceptionDesc && (
                        <span className="text-red-800">
                          <strong>Misconception:</strong> {it.misconceptionDesc}
                        </span>
                      )}
                    </div>

                    <details className="mt-2.5 rounded-sm bg-muted/40 px-2.5 py-1.5">
                      <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                        Attempt timeline ({it.history.length} response
                        {it.history.length === 1 ? "" : "s"})
                      </summary>
                      <ol className="mt-2 space-y-1.5">
                        {it.history.map((h, hi) => (
                          <li
                            key={hi}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                          >
                            <span>
                              <strong className={h.correct ? "text-emerald-700" : "text-red-700"}>
                                Try #{hi + 1} (Round #{h.attemptNumber}):{" "}
                                {h.correct ? "✓" : "✗"}
                              </strong>{" "}
                              — answered <code className="rounded bg-card px-1">{h.responseSummary}</code>
                              {h.confidence && (
                                <span className="ml-1.5 text-muted-foreground">
                                  [{h.confidence === "sure" ? "Sure" : "Unsure"}]
                                </span>
                              )}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {fmtDuration(h.timeMs)} • {fmtDate(h.answeredAt)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
