import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Download, Edit3 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { loadEffectiveCurriculum } from "@/lib/review/bank";
import { GAMES, PASS_PERCENT } from "@/lib/review/games";
import {
  extractItemTraps,
  formatItemAnswerKey,
  SKILL_DESCRIPTIONS,
  standardForCheckpoint,
} from "@/lib/review/standards";
import type { FormLevel, Item } from "@/lib/review/types";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function renderItemBody(item: Item) {
  switch (item.kind) {
    case "mcq":
    case "multi": {
      const ansSet = new Set(
        item.kind === "mcq" ? [item.answer] : item.answer,
      );
      return (
        <ol className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {item.options.map((o, idx) => {
            const correct = ansSet.has(o.id);
            return (
              <li
                key={o.id}
                className={`rounded-md border px-3 py-2 text-xs ${
                  correct
                    ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-950"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <span className="font-mono font-bold">
                  {String.fromCharCode(65 + idx)}.
                </span>{" "}
                {o.text}
                {correct ? "  [✓ Correct]" : ""}
              </li>
            );
          })}
        </ol>
      );
    }
    case "order":
      return (
        <div className="mt-2.5 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <div className="mb-1.5 font-semibold text-muted-foreground">
            Correct Ordered Steps (shuffled during student play):
          </div>
          <ol className="space-y-1 font-mono">
            {item.steps.map((s, idx) => (
              <li key={s.id}>
                <strong>{idx + 1}.</strong> {s.text}
              </li>
            ))}
          </ol>
        </div>
      );
    case "match":
      return (
        <div className="mt-2.5 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <div className="mb-1.5 font-semibold text-muted-foreground">
            Matched Pairs:
          </div>
          <ul className="space-y-1">
            {item.pairs.map((p) => (
              <li key={p.id}>
                <strong>{p.left}</strong> ↔ {p.right}
              </li>
            ))}
          </ul>
        </div>
      );
    case "sort":
      return (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {item.buckets.map((b) => (
            <div
              key={b.id}
              className="rounded-md border border-border bg-muted/30 p-2.5 text-xs"
            >
              <div className="font-bold text-foreground">{b.label}</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                {item.cards
                  .filter((c) => c.bucket === b.id)
                  .map((c) => (
                    <li key={c.id} className="text-foreground">
                      {c.text}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "bug":
      return (
        <ol className="mt-2.5 space-y-1 rounded-md border border-stone-800 bg-stone-900 p-3 font-mono text-xs text-stone-100">
          {item.lines.map((ln, idx) => {
            const faulty = idx === item.answer;
            return (
              <li
                key={idx}
                className={`rounded-sm px-2 py-1 ${
                  faulty ? "bg-red-900/70 font-bold text-amber-200" : ""
                }`}
              >
                <span className="mr-2 inline-block w-5 text-stone-400">
                  {idx + 1}.
                </span>
                {ln}
                {faulty ? "   ← [BUGGY LINE]" : ""}
              </li>
            );
          })}
        </ol>
      );
    case "binary":
      return (
        <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs">
          Switches: {item.bits}-bit register • Target decimal: {item.target}₁₀ →{" "}
          <strong>{item.target.toString(2).padStart(item.bits, "0")}₂</strong>
        </div>
      );
    case "input":
      return null;
  }
}

export default async function ChapterTeacherGuidePage({
  params,
}: {
  params: Promise<{ form: string; chapterId: string }>;
}) {
  await requireAdminPage();
  const { form: rawForm, chapterId } = await params;
  const form = Number(rawForm) as FormLevel;
  const curriculum = await loadEffectiveCurriculum(form);
  const chapter = curriculum?.chapters.find((c) => c.id === chapterId);
  if (!curriculum || !chapter) notFound();

  const totalQuestions = chapter.checkpoints.reduce(
    (s, c) => s + c.items.length,
    0,
  );
  const staticPdfHref = `/teacher-guides/Form${form}-Bab${chapter.number}-Teachers-Guide.pdf`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Action Toolbar (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/review"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Review Quest
          </Link>
          <span className="text-muted-foreground">•</span>
          <div className="flex flex-wrap gap-1.5">
            {curriculum.chapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/review/guide/${form}/${ch.id}`}
                className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                  ch.id === chapter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-primary hover:bg-secondary/80"
                }`}
              >
                Bab {ch.number}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/review/bank">
              <Edit3 size={14} /> Edit Questions
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={staticPdfHref} download>
              <Download size={14} /> Download PDF
            </a>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Chapter Cover Banner */}
      <header className="invoice-document-header rounded-lg bg-[#b82f25] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-100">
          Teacher&apos;s Review & Discussion Guide • Form {curriculum.form}{" "}
          {curriculum.subject}
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
          Bab {chapter.number}: {chapter.titleMs}
        </h1>
        <p className="mt-1 text-base font-medium text-amber-200">
          {chapter.title} — {chapter.blurb}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="rounded-full bg-black/20 px-3 py-1">
            {chapter.checkpoints.length} Sub-chapter Checkpoints
          </span>
          <span className="rounded-full bg-black/20 px-3 py-1">
            {totalQuestions} Questions with Full Answer Keys
          </span>
          <span className="rounded-full bg-black/20 px-3 py-1">
            Pass Gate: {PASS_PERCENT}% • Target 5–8 min / checkpoint
          </span>
        </div>
      </header>

      {/* Quick Sub-chapter Jump Index */}
      <nav
        aria-label="Chapter checkpoints outline"
        className="rounded-lg border border-border bg-card p-5 shadow-2xs"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <BookOpenCheck size={17} className="text-primary" aria-hidden="true" />
          Sub-chapter Checkpoints & KSSM Standard Pembelajaran Summary
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Subtopic</th>
                <th className="py-2 pr-3">Game Mode</th>
                <th className="py-2 pr-3">Questions</th>
                <th className="py-2">KSSM Standard Pembelajaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {chapter.checkpoints.map((cp) => {
                const std = standardForCheckpoint(cp);
                const g = GAMES[cp.game];
                return (
                  <tr key={cp.id}>
                    <td className="py-2 pr-3 font-mono font-bold text-primary">
                      <a href={`#${cp.id}`} className="hover:underline">
                        {cp.boss ? `BOSS ${cp.code}` : cp.code}
                      </a>
                    </td>
                    <td className="py-2 pr-3 font-semibold text-foreground">
                      {cp.title}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {g.name}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                      {cp.items.length} (draws {cp.draw})
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {std.standardPembelajaranMs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </nav>

      {/* Chapter Misconception Reference Catalogue */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-2xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          Bab {chapter.number} Diagnostic Misconception Catalogue
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Distractors and input traps in this chapter are engineered to detect these specific learner misconceptions:
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(chapter.misconceptions).map(([tag, desc]) => (
            <div
              key={tag}
              className="rounded-md border border-border/80 bg-muted/25 p-2.5 text-xs"
            >
              <span className="font-mono font-bold text-primary">{tag}</span>
              <p className="mt-0.5 leading-relaxed text-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Checkpoints & Full Questions */}
      {chapter.checkpoints.map((cp) => {
        const std = standardForCheckpoint(cp);
        const game = GAMES[cp.game];
        return (
          <section
            key={cp.id}
            id={cp.id}
            className="space-y-4 rounded-lg border-2 border-border bg-card p-5 shadow-xs sm:p-6"
          >
            <div className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-sm bg-secondary px-2.5 py-1 font-mono text-xs font-bold text-primary">
                  {cp.boss ? `MASTERY BOSS ${cp.code}` : `CHECKPOINT ${cp.code}`}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                  Game Mode: {game.name} • Pool {cp.items.length} q (draws {cp.draw})
                </span>
              </div>

              <h2 className="font-display mt-2 text-xl font-bold text-foreground">
                {cp.code} — {cp.title}
              </h2>
              <p className="text-sm text-muted-foreground">{cp.titleMs}</p>

              <div className="mt-3 grid gap-3 rounded-md bg-secondary/40 p-3.5 text-xs sm:grid-cols-2">
                <div>
                  <div className="font-bold text-primary">
                    Standard Pembelajaran (KSSM DSKP):
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {std.standardPembelajaranMs}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {std.standardPembelajaranEn}
                  </p>
                </div>
                <div>
                  <div className="font-bold text-primary">
                    What Student Must Achieve / What We Measure:
                  </div>
                  <p className="mt-1 text-foreground">{std.measuring}</p>
                  <p className="mt-1 text-muted-foreground">
                    <strong>Why {game.name}:</strong> {game.evidence}
                  </p>
                </div>
              </div>
            </div>

            {/* Every Question in the Checkpoint */}
            <div className="space-y-4">
              {cp.items.map((item, qi) => {
                const answerKey = formatItemAnswerKey(item);
                const traps = extractItemTraps(item, chapter.misconceptions);
                return (
                  <article
                    key={item.id}
                    className="invoice-section rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-sm bg-primary px-2 py-0.5 font-mono font-bold text-primary-foreground">
                          Q{qi + 1}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {item.id}
                        </span>
                        <span className="rounded-sm bg-secondary px-2 py-0.5 font-semibold uppercase text-primary">
                          {item.kind}
                        </span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {SKILL_DESCRIPTIONS[item.skill]}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-foreground">
                      {item.prompt}
                    </p>

                    {item.code && (
                      <pre className="mt-2.5 overflow-x-auto rounded-md bg-stone-900 p-3 font-mono text-xs leading-relaxed text-amber-100">
                        <code>{item.code}</code>
                      </pre>
                    )}

                    {renderItemBody(item)}

                    <div className="mt-3 space-y-1.5 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                      <div>
                        <strong className="text-emerald-900">Answer Key: </strong>
                        <span className="font-mono font-semibold text-emerald-950">
                          {answerKey}
                        </span>
                      </div>
                      <div>
                        <strong className="text-stone-900">
                          Discussion & Teaching Explanation:{" "}
                        </strong>
                        <span className="leading-relaxed text-stone-800">
                          {item.explanation}
                        </span>
                      </div>
                      {traps.length > 0 && (
                        <div className="pt-1 text-amber-950">
                          <strong>Diagnostic Misconception Probes: </strong>
                          <ul className="mt-0.5 list-inside list-disc space-y-0.5">
                            {traps.map((t, ti) => (
                              <li key={ti}>
                                <span className="font-medium">{t.trigger}</span>{" "}
                                (<code className="font-mono">{t.tag}</code>):{" "}
                                {t.meaning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
