import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Edit3,
  Sparkles,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getTeacherReviewOverview } from "@/lib/review/service";
import { loadEffectiveCurriculum } from "@/lib/review/bank";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

export default async function AdminReviewOverviewPage() {
  await requireAdminPage();
  const [{ students }, form1] = await Promise.all([
    getTeacherReviewOverview(),
    loadEffectiveCurriculum(1),
  ]);

  const activeStudents = students.filter((s) => s.active);
  const totalCompletedRounds = activeStudents.reduce(
    (s, r) => s + r.completedAttempts,
    0,
  );
  const studentsNeedingAttention = activeStudents.filter(
    (s) => s.struggleCount > 0 || s.blindSpotCount > 0 || !s.form,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learner Intelligence"
        title="Review Quest Progress"
        subtitle="Track station mastery, retry learning gains, misconceptions, confidence blind spots, and study pace across every learner."
        action={
          <Button asChild>
            <Link href="/review/bank">
              <Edit3 size={15} /> Manage Question Bank
            </Link>
          </Button>
        }
      />

      {form1 && (
        <section
          aria-labelledby="teacher-guides-heading"
          className="rounded-lg border border-border bg-card p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="teacher-guides-heading"
                className="flex items-center gap-2 text-sm font-bold text-foreground"
              >
                <BookOpenCheck size={17} className="text-primary" aria-hidden="true" />
                Form 1 Teacher&apos;s Review & Discussion Guides (KSSM ASK)
              </h2>
              <p className="text-xs text-muted-foreground">
                Full question bank, answer keys, KSSM Standard Pembelajaran mapping, diagnostic misconception probes, and discussion notes per chapter.
              </p>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {form1.chapters.map((ch) => {
              const qCount = ch.checkpoints.reduce((s, c) => s + c.items.length, 0);
              const pdfUrl = `/teacher-guides/Form1-Bab${ch.number}-Teachers-Guide.pdf`;
              return (
                <div
                  key={ch.id}
                  className="flex flex-col justify-between rounded-md border border-border bg-background p-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>Bab {ch.number}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {ch.checkpoints.length} checkpoints • {qCount} q
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-foreground">
                      {ch.title}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {ch.titleMs !== ch.title ? ch.titleMs : ch.blurb}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/70 pt-2.5">
                    <Link
                      href={`/review/guide/1/${ch.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-sm bg-secondary px-2 py-1.5 font-semibold text-primary hover:bg-secondary/80"
                    >
                      <BookOpenCheck size={13} aria-hidden="true" />
                      Scroll Guide
                    </Link>
                    <a
                      href={pdfUrl}
                      download
                      className="inline-flex items-center justify-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1.5 font-semibold text-foreground hover:border-primary/40"
                    >
                      <Download size={13} aria-hidden="true" />
                      PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-label="Roster summary" className="grid gap-3.5 sm:grid-cols-3">
        <div className="kpi-hero-surface rounded-lg border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Active Learners</span>
            <Compass size={16} className="text-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {activeStudents.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Scoped individually by Form 1–5
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Completed Checkpoint Rounds</span>
            <Sparkles size={16} className="text-amber-600" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {totalCompletedRounds}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            80% score required to unlock next checkpoint
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Needs Tutor Attention</span>
            <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {studentsNeedingAttention}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Blocked checkpoints, blind spots, or unset Form
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Form</th>
                <th className="px-4 py-3 font-semibold">Mastery</th>
                <th className="px-4 py-3 font-semibold">Accuracy</th>
                <th className="px-4 py-3 font-semibold">Rounds & Time</th>
                <th className="px-4 py-3 font-semibold">Signals</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No students yet. Add a student to start tracking Review Quest progress.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-secondary/30">
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      <Link href={`/review/${s.studentId}`} className="hover:text-primary hover:underline">
                        {s.studentName}
                      </Link>
                      {!s.active && (
                        <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {s.form ? (
                        <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                          Form {s.form}
                        </span>
                      ) : (
                        <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Unset ({s.gradeLevel || "none"})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {s.curriculumReady ? (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold">
                            {s.passedCheckpoints} / {s.totalCheckpoints} ({s.masteryPct}%)
                          </div>
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${s.masteryPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {s.form ? `Form ${s.form} bank pending` : "Set Form first"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">
                      {s.accuracyPct !== null ? `${s.accuracyPct}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular-nums text-muted-foreground">
                      <div>
                        <strong className="text-foreground">{s.completedAttempts}</strong> rounds
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <Clock size={11} aria-hidden="true" />
                        {fmtDuration(s.studyDurationMs)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {s.struggleCount > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-900">
                            {s.struggleCount} blocked
                          </span>
                        )}
                        {s.blindSpotCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                            {s.blindSpotCount} blind spot{s.blindSpotCount === 1 ? "" : "s"}
                          </span>
                        )}
                        {s.struggleCount === 0 &&
                          s.blindSpotCount === 0 &&
                          s.completedAttempts > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
                              <CheckCircle2 size={11} aria-hidden="true" />
                              On track
                            </span>
                          )}
                        {s.completedAttempts === 0 && (
                          <span className="text-muted-foreground">Not started</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/review/${s.studentId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        Inspect
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
