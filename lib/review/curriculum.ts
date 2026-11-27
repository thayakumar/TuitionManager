import type { Chapter, Checkpoint, Curriculum, FormLevel } from "./types";
import { form1 } from "./content/form1";

/** Forms with authored content. Add form2..form5 here as they are written. */
const CURRICULA: Partial<Record<FormLevel, Curriculum>> = { 1: form1 };

/**
 * The student's form comes from their profile's level field ("Form 1",
 * "Tingkatan 2", "F3", "3"). It is read fresh on every request, so moving a
 * student to the next form immediately switches their map while old progress
 * stays stored against the old form.
 */
export function parseForm(gradeLevel: string | null | undefined): FormLevel | null {
  if (!gradeLevel) return null;
  const text = gradeLevel.trim().toLowerCase();
  const match =
    text.match(/(?:form|tingkatan|ting\.?|f|t)\s*-?\s*([1-5])\b/) ?? text.match(/^([1-5])$/);
  return match ? (Number(match[1]) as FormLevel) : null;
}

export function curriculumFor(form: FormLevel | null): Curriculum | null {
  return form ? (CURRICULA[form] ?? null) : null;
}

export function availableForms(): FormLevel[] {
  return (Object.keys(CURRICULA).map(Number) as FormLevel[]).sort();
}

export type Located = { curriculum: Curriculum; chapter: Chapter; checkpoint: Checkpoint; index: number };

export function findCheckpoint(curriculum: Curriculum, checkpointId: string): Located | null {
  for (const chapter of curriculum.chapters) {
    const index = chapter.checkpoints.findIndex((c) => c.id === checkpointId);
    if (index >= 0) return { curriculum, chapter, checkpoint: chapter.checkpoints[index], index };
  }
  return null;
}

export function findChapter(curriculum: Curriculum, chapterId: string): Chapter | null {
  return curriculum.chapters.find((c) => c.id === chapterId) ?? null;
}

/** Item lookup across a curriculum (for analytics on historical answers). */
export function itemIndex(curriculum: Curriculum) {
  const map = new Map<string, { item: Checkpoint["items"][number]; checkpoint: Checkpoint; chapter: Chapter }>();
  for (const chapter of curriculum.chapters)
    for (const checkpoint of chapter.checkpoints)
      for (const item of checkpoint.items) map.set(item.id, { item, checkpoint, chapter });
  return map;
}
