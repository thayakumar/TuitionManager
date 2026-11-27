import type { InValue } from "@libsql/client";
import { queryAll, queryOne, withTransaction } from "../db";
import { getStudentSession, verifyAdminSession } from "../auth";
import {
  availableForms,
  curriculumFor,
  findChapter,
  findCheckpoint,
  itemIndex,
  parseForm,
} from "./curriculum";
import {
  computeUnlockMap,
  describeResponse,
  gradeItem,
  selectAttemptItems,
  starsForScore,
  toClientItem,
  type CheckpointProgressSummary,
} from "./engine";
import { GAMES, PASS_PERCENT } from "./games";
import type {
  ClientItem,
  Confidence,
  Curriculum,
  FormLevel,
  GradeResult,
  ItemResponse,
  Skill,
  ThemeId,
} from "./types";

export class ReviewError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "REVIEW_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type StudentRow = {
  id: number;
  name: string;
  grade_level: string | null;
  active: number;
};

type AttemptRow = {
  id: number;
  student_id: number;
  form_level: number;
  checkpoint_id: string;
  curriculum_version: string;
  attempt_number: number;
  status: "in_progress" | "completed" | "abandoned";
  item_ids_json: string;
  seed: number;
  score_pct: number | null;
  points_earned: number;
  points_max: number;
  passed: number;
  duration_ms: number;
  started_at: string;
  completed_at: string | null;
};

type ResponseRow = {
  id: number;
  attempt_id: number;
  student_id: number;
  form_level: number;
  checkpoint_id: string;
  item_id: string;
  position: number;
  skill: Skill;
  response_json: string;
  score: number;
  correct: number;
  confidence: Confidence | null;
  misconception: string | null;
  time_ms: number;
  answered_at: string;
};

function safeStudentId(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new ReviewError(400, "Invalid student ID", "INVALID_STUDENT");
  }
  return n;
}

async function requireStudentActor(expectedStudentId?: number): Promise<StudentRow> {
  const sessionStudentId = await getStudentSession();
  if (!sessionStudentId) {
    throw new ReviewError(401, "Please sign in as a student to play Review Quest.", "UNAUTHENTICATED");
  }
  if (expectedStudentId !== undefined && sessionStudentId !== expectedStudentId) {
    throw new ReviewError(403, "You can only access your own Review Quest.", "FORBIDDEN");
  }
  const student = await queryOne<StudentRow>(
    "SELECT id, name, grade_level, active FROM students WHERE id = ? AND active = 1",
    [sessionStudentId],
  );
  if (!student) {
    throw new ReviewError(403, "Student account is inactive or unavailable.", "INACTIVE_STUDENT");
  }
  return student;
}

async function requireAdminActor(): Promise<void> {
  if (!(await verifyAdminSession())) {
    throw new ReviewError(403, "Tutor access required.", "FORBIDDEN");
  }
}

export type StudentMapPayload = {
  student: { id: number; name: string; gradeLevel: string | null; form: FormLevel | null };
  status: "ready" | "unset_form" | "coming_soon";
  availableForms: FormLevel[];
  curriculum: null | {
    form: FormLevel;
    subject: string;
    version: string;
    passPercent: number;
    totalCheckpoints: number;
    passedCheckpoints: number;
    totalStars: number;
    maxStars: number;
    nextCheckpoint: { chapterId: string; checkpointId: string; code: string; title: string } | null;
    chapters: Array<{
      id: string;
      number: number;
      title: string;
      titleMs: string;
      theme: ThemeId;
      blurb: string;
      unlocked: boolean;
      completed: boolean;
      passedCount: number;
      totalCount: number;
      stars: number;
      maxStars: number;
      checkpoints: Array<
        CheckpointProgressSummary & {
          code: string;
          title: string;
          titleMs: string;
          boss: boolean;
          game: string;
          gameName: string;
          gameTagline: string;
          gameIcon: string;
          draw: number;
        }
      >;
    }>;
  };
};

async function buildCurriculumProgress(
  studentId: number,
  curriculum: Curriculum,
): Promise<NonNullable<StudentMapPayload["curriculum"]>> {
  const [attempts, unlocks] = await Promise.all([
    queryAll<AttemptRow>(
      "SELECT * FROM review_attempts WHERE student_id = ? AND form_level = ? ORDER BY attempt_number ASC",
      [studentId, curriculum.form],
    ),
    queryAll<{ checkpoint_id: string }>(
      "SELECT checkpoint_id FROM review_unlocks WHERE student_id = ? AND form_level = ?",
      [studentId, curriculum.form],
    ),
  ]);

  const tutorSet = new Set(unlocks.map((u) => u.checkpoint_id));
  const byCp = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const list = byCp.get(a.checkpoint_id) ?? [];
    list.push(a);
    byCp.set(a.checkpoint_id, list);
  }

  const passedIds = new Set<string>();
  for (const [cpId, list] of byCp.entries()) {
    if (list.some((a) => a.status === "completed" && (a.score_pct ?? 0) >= PASS_PERCENT)) {
      passedIds.add(cpId);
    }
  }

  const unlockMap = computeUnlockMap(curriculum, passedIds, tutorSet);

  let passedCheckpoints = 0;
  let totalCheckpoints = 0;
  let totalStars = 0;
  let maxStars = 0;
  let nextCheckpoint: NonNullable<StudentMapPayload["curriculum"]>["nextCheckpoint"] = null;

  const chapters = curriculum.chapters.map((ch) => {
    let chPassed = 0;
    let chStars = 0;
    const chMaxStars = ch.checkpoints.length * 3;
    const checkpoints = ch.checkpoints.map((cp) => {
      totalCheckpoints++;
      maxStars += 3;
      const list = byCp.get(cp.id) ?? [];
      const completed = list.filter((a) => a.status === "completed");
      const inProg = list.find((a) => a.status === "in_progress") ?? null;
      const bestScore = completed.length
        ? Math.max(...completed.map((a) => a.score_pct ?? 0))
        : null;
      const firstScore = completed.length ? (completed[0].score_pct ?? 0) : null;
      const lastScore = completed.length
        ? (completed[completed.length - 1].score_pct ?? 0)
        : null;
      const passed = bestScore !== null && bestScore >= PASS_PERCENT;
      const stars = starsForScore(bestScore);
      const unlocked = unlockMap.get(cp.id) ?? false;
      if (passed) {
        passedCheckpoints++;
        chPassed++;
      }
      chStars += stars;
      totalStars += stars;
      if (!nextCheckpoint && unlocked && !passed) {
        nextCheckpoint = {
          chapterId: ch.id,
          checkpointId: cp.id,
          code: cp.code,
          title: cp.title,
        };
      }
      const durations = completed.map((a) => a.duration_ms).filter((d) => d > 0);
      const bestDurationMs = durations.length ? Math.min(...durations) : null;
      const avgDurationMs = durations.length
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : null;
      const lastPlayedAt = completed.length
        ? completed[completed.length - 1].completed_at
        : inProg?.started_at ?? null;
      const g = GAMES[cp.game];
      return {
        checkpointId: cp.id,
        code: cp.code,
        title: cp.title,
        titleMs: cp.titleMs,
        boss: !!cp.boss,
        game: cp.game,
        gameName: g.name,
        gameTagline: g.tagline,
        gameIcon: g.icon,
        draw: cp.draw,
        attempts: completed.length,
        bestScore,
        firstScore,
        lastScore,
        passed,
        stars,
        unlocked,
        tutorUnlocked: tutorSet.has(cp.id),
        inProgressAttemptId: inProg?.id ?? null,
        bestDurationMs,
        avgDurationMs,
        lastPlayedAt,
      };
    });

    const chUnlocked = checkpoints.some((c) => c.unlocked);
    const chCompleted = checkpoints.length > 0 && chPassed === checkpoints.length;
    return {
      id: ch.id,
      number: ch.number,
      title: ch.title,
      titleMs: ch.titleMs,
      theme: ch.theme,
      blurb: ch.blurb,
      unlocked: chUnlocked,
      completed: chCompleted,
      passedCount: chPassed,
      totalCount: ch.checkpoints.length,
      stars: chStars,
      maxStars: chMaxStars,
      checkpoints,
    };
  });

  return {
    form: curriculum.form,
    subject: curriculum.subject,
    version: curriculum.version,
    passPercent: PASS_PERCENT,
    totalCheckpoints,
    passedCheckpoints,
    totalStars,
    maxStars,
    nextCheckpoint,
    chapters,
  };
}

/** Student's own Review Quest world map — strictly scoped to their current Form. */
export async function getStudentReviewMap(studentId: number): Promise<StudentMapPayload> {
  const sid = safeStudentId(studentId);
  const student = await requireStudentActor(sid);
  const form = parseForm(student.grade_level);
  const forms = availableForms();
  if (!form) {
    return {
      student: { id: student.id, name: student.name, gradeLevel: student.grade_level, form: null },
      status: "unset_form",
      availableForms: forms,
      curriculum: null,
    };
  }
  const curriculum = curriculumFor(form);
  if (!curriculum) {
    return {
      student: { id: student.id, name: student.name, gradeLevel: student.grade_level, form },
      status: "coming_soon",
      availableForms: forms,
      curriculum: null,
    };
  }
  return {
    student: { id: student.id, name: student.name, gradeLevel: student.grade_level, form },
    status: "ready",
    availableForms: forms,
    curriculum: await buildCurriculumProgress(student.id, curriculum),
  };
}

export type ActiveSessionPayload = {
  attemptId: number;
  attemptNumber: number;
  status: "in_progress" | "completed";
  chapter: { id: string; number: number; title: string; titleMs: string; theme: ThemeId };
  checkpoint: {
    id: string;
    code: string;
    title: string;
    titleMs: string;
    boss: boolean;
    objective: string;
    passPercent: number;
    bestScore: number | null;
    previousAttempts: number;
  };
  game: {
    id: string;
    name: string;
    tagline: string;
    howTo: string;
    icon: string;
  };
  items: ClientItem[];
  answered: Record<
    string,
    {
      response: ItemResponse;
      confidence: Confidence | null;
      result: GradeResult;
      timeMs: number;
    }
  >;
  summary: null | {
    scorePct: number;
    passed: boolean;
    stars: 0 | 1 | 2 | 3;
    pointsEarned: number;
    pointsMax: number;
    durationMs: number;
    nextCheckpoint: { chapterId: string; checkpointId: string; code: string; title: string } | null;
  };
};

function findNextCheckpointAfter(
  curriculum: Curriculum,
  checkpointId: string,
): { chapterId: string; checkpointId: string; code: string; title: string } | null {
  const flat: Array<{ chapterId: string; id: string; code: string; title: string }> = [];
  for (const ch of curriculum.chapters) {
    for (const cp of ch.checkpoints) {
      flat.push({ chapterId: ch.id, id: cp.id, code: cp.code, title: cp.title });
    }
  }
  const idx = flat.findIndex((c) => c.id === checkpointId);
  if (idx < 0 || idx + 1 >= flat.length) return null;
  const next = flat[idx + 1];
  return {
    chapterId: next.chapterId,
    checkpointId: next.id,
    code: next.code,
    title: next.title,
  };
}

/** Start or resume an attempt on a checkpoint (strictly enforcing student's Form & 80% lock gate). */
export async function startOrResumeCheckpoint(
  studentId: number,
  checkpointId: string,
  options: { forceRestart?: boolean } = {},
): Promise<ActiveSessionPayload> {
  const sid = safeStudentId(studentId);
  const student = await requireStudentActor(sid);
  const form = parseForm(student.grade_level);
  if (!form) {
    throw new ReviewError(400, "Your tutor has not assigned your Form level yet.", "FORM_NOT_SET");
  }
  const curriculum = curriculumFor(form);
  if (!curriculum) {
    throw new ReviewError(404, `Form ${form} Review Quest is coming soon.`, "FORM_UNAVAILABLE");
  }
  const located = findCheckpoint(curriculum, checkpointId);
  if (!located) {
    throw new ReviewError(403, "That checkpoint does not belong to your Form.", "WRONG_FORM_CHECKPOINT");
  }
  const { chapter, checkpoint } = located;
  const poolMap = new Map(checkpoint.items.map((i) => [i.id, i]));

  return withTransaction(async (tx) => {
    const completedRows = (
      await tx.execute({
        sql: "SELECT checkpoint_id, score_pct FROM review_attempts WHERE student_id = ? AND form_level = ? AND status = 'completed'",
        args: [sid, form],
      })
    ).rows;
    const passedIds = new Set<string>();
    let cpBest: number | null = null;
    let cpCompletedCount = 0;
    for (const r of completedRows) {
      const pct = Number(r.score_pct ?? 0);
      if (pct >= PASS_PERCENT) passedIds.add(String(r.checkpoint_id));
      if (String(r.checkpoint_id) === checkpoint.id) {
        cpCompletedCount++;
        cpBest = cpBest === null ? pct : Math.max(cpBest, pct);
      }
    }
    const unlockRows = (
      await tx.execute({
        sql: "SELECT checkpoint_id FROM review_unlocks WHERE student_id = ? AND form_level = ?",
        args: [sid, form],
      })
    ).rows;
    const tutorSet = new Set(unlockRows.map((r) => String(r.checkpoint_id)));
    const unlockMap = computeUnlockMap(curriculum, passedIds, tutorSet);
    if (!unlockMap.get(checkpoint.id)) {
      throw new ReviewError(
        403,
        `This checkpoint is locked. Score at least ${PASS_PERCENT}% on the previous checkpoint to unlock it!`,
        "CHECKPOINT_LOCKED",
      );
    }

    const now = new Date().toISOString();
    if (options.forceRestart) {
      await tx.execute({
        sql: "UPDATE review_attempts SET status = 'abandoned' WHERE student_id = ? AND checkpoint_id = ? AND status = 'in_progress'",
        args: [sid, checkpoint.id],
      });
    }

    let activeRow = (
      await tx.execute({
        sql: "SELECT * FROM review_attempts WHERE student_id = ? AND checkpoint_id = ? AND status = 'in_progress' ORDER BY attempt_number DESC LIMIT 1",
        args: [sid, checkpoint.id],
      })
    ).rows[0] as unknown as AttemptRow | undefined;

    if (activeRow) {
      const ids: string[] = JSON.parse(String(activeRow.item_ids_json));
      if (!ids.length || ids.some((id) => !poolMap.has(id))) {
        await tx.execute({
          sql: "UPDATE review_attempts SET status = 'abandoned' WHERE id = ?",
          args: [activeRow.id],
        });
        activeRow = undefined;
      }
    }

    if (!activeRow) {
      const maxRow = (
        await tx.execute({
          sql: "SELECT COALESCE(MAX(attempt_number), 0) AS m FROM review_attempts WHERE student_id = ? AND checkpoint_id = ?",
          args: [sid, checkpoint.id],
        })
      ).rows[0];
      const nextNum = Number(maxRow?.m ?? 0) + 1;

      const historyRows = (
        await tx.execute({
          sql: "SELECT item_id, correct FROM review_item_responses WHERE student_id = ? AND checkpoint_id = ? ORDER BY answered_at ASC",
          args: [sid, checkpoint.id],
        })
      ).rows;
      const seenIds = new Set<string>();
      const latestCorrect = new Map<string, boolean>();
      for (const hr of historyRows) {
        const iid = String(hr.item_id);
        seenIds.add(iid);
        latestCorrect.set(iid, Number(hr.correct) === 1);
      }
      const missedIds = new Set<string>();
      for (const [iid, ok] of latestCorrect.entries()) {
        if (!ok) missedIds.add(iid);
      }

      const seed = ((sid * 2654435761) ^ (nextNum * 40503) ^ Date.now()) >>> 0 || 1;
      const chosenIds = selectAttemptItems(
        checkpoint.items,
        checkpoint.draw,
        seed,
        missedIds,
        seenIds,
      );
      const ins = await tx.execute({
        sql: `INSERT INTO review_attempts(
          student_id, form_level, checkpoint_id, curriculum_version, attempt_number,
          status, item_ids_json, seed, points_max, started_at
        ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?)`,
        args: [
          sid,
          form,
          checkpoint.id,
          curriculum.version,
          nextNum,
          JSON.stringify(chosenIds),
          seed,
          chosenIds.length,
          now,
        ],
      });
      activeRow = {
        id: Number(ins.lastInsertRowid),
        student_id: sid,
        form_level: form,
        checkpoint_id: checkpoint.id,
        curriculum_version: curriculum.version,
        attempt_number: nextNum,
        status: "in_progress",
        item_ids_json: JSON.stringify(chosenIds),
        seed,
        score_pct: null,
        points_earned: 0,
        points_max: chosenIds.length,
        passed: 0,
        duration_ms: 0,
        started_at: now,
        completed_at: null,
      };
    }

    const itemIds: string[] = JSON.parse(String(activeRow.item_ids_json));
    const seed = Number(activeRow.seed) || 1;
    const clientItems = itemIds.map((iid, idx) =>
      toClientItem(poolMap.get(iid)!, (seed + idx * 7919) >>> 0),
    );

    const savedRows = (
      await tx.execute({
        sql: "SELECT * FROM review_item_responses WHERE attempt_id = ? ORDER BY position ASC",
        args: [activeRow.id],
      })
    ).rows as unknown as ResponseRow[];

    const answered: ActiveSessionPayload["answered"] = {};
    for (const sr of savedRows) {
      const item = poolMap.get(String(sr.item_id));
      if (!item) continue;
      const resp = JSON.parse(String(sr.response_json)) as ItemResponse;
      answered[item.id] = {
        response: resp,
        confidence: (sr.confidence as Confidence | null) ?? null,
        result: gradeItem(item, resp, chapter.misconceptions),
        timeMs: Number(sr.time_ms) || 0,
      };
    }

    const g = GAMES[checkpoint.game];
    return {
      attemptId: Number(activeRow.id),
      attemptNumber: Number(activeRow.attempt_number),
      status: activeRow.status === "completed" ? "completed" : "in_progress",
      chapter: {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        titleMs: chapter.titleMs,
        theme: chapter.theme,
      },
      checkpoint: {
        id: checkpoint.id,
        code: checkpoint.code,
        title: checkpoint.title,
        titleMs: checkpoint.titleMs,
        boss: !!checkpoint.boss,
        objective: checkpoint.objective,
        passPercent: PASS_PERCENT,
        bestScore: cpBest,
        previousAttempts: cpCompletedCount,
      },
      game: {
        id: g.id,
        name: g.name,
        tagline: g.tagline,
        howTo: g.howTo,
        icon: g.icon,
      },
      items: clientItems,
      answered,
      summary: null,
    };
  });
}

export type SubmitAnswerResult = {
  itemId: string;
  result: GradeResult;
  completed: boolean;
  summary: ActiveSessionPayload["summary"];
};

export async function submitCheckpointAnswer(input: {
  studentId: number;
  attemptId: number;
  itemId: string;
  response: ItemResponse;
  confidence?: Confidence | null;
  timeMs?: number;
}): Promise<SubmitAnswerResult> {
  const sid = safeStudentId(input.studentId);
  const student = await requireStudentActor(sid);
  const attemptId = Number(input.attemptId);
  if (!Number.isSafeInteger(attemptId) || attemptId < 1) {
    throw new ReviewError(400, "Invalid attempt ID", "INVALID_ATTEMPT");
  }
  const activeForm = parseForm(student.grade_level);
  if (!activeForm) {
    throw new ReviewError(400, "Your Form level is not configured.", "FORM_NOT_SET");
  }
  const boundedTimeMs = Math.max(
    0,
    Math.min(300_000, Math.round(Number(input.timeMs) || 0)),
  );
  const confidence: Confidence | null =
    input.confidence === "sure" || input.confidence === "unsure"
      ? input.confidence
      : null;

  return withTransaction(async (tx) => {
    const attempt = (
      await tx.execute({
        sql: "SELECT * FROM review_attempts WHERE id = ? AND student_id = ?",
        args: [attemptId, sid],
      })
    ).rows[0] as unknown as AttemptRow | undefined;

    if (!attempt) {
      throw new ReviewError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    }
    if (Number(attempt.form_level) !== activeForm) {
      throw new ReviewError(
        403,
        "Your Form level has changed; return to your Review Quest map.",
        "FORM_CHANGED",
      );
    }
    if (attempt.status === "abandoned") {
      throw new ReviewError(409, "This attempt was restarted. Start a fresh round.", "ATTEMPT_ABANDONED");
    }

    const curriculum = curriculumFor(activeForm);
    const located = curriculum ? findCheckpoint(curriculum, String(attempt.checkpoint_id)) : null;
    if (!curriculum || !located) {
      throw new ReviewError(404, "Checkpoint definition not found.", "CHECKPOINT_MISSING");
    }
    const { chapter, checkpoint } = located;
    const itemIds: string[] = JSON.parse(String(attempt.item_ids_json));
    const position = itemIds.indexOf(input.itemId);
    if (position < 0) {
      throw new ReviewError(400, "Question does not belong to this attempt.", "INVALID_ITEM");
    }
    const item = checkpoint.items.find((i) => i.id === input.itemId);
    if (!item) {
      throw new ReviewError(404, "Question definition missing.", "ITEM_MISSING");
    }

    const existing = (
      await tx.execute({
        sql: "SELECT * FROM review_item_responses WHERE attempt_id = ? AND item_id = ?",
        args: [attemptId, item.id],
      })
    ).rows[0] as unknown as ResponseRow | undefined;

    let graded: GradeResult;
    if (existing) {
      graded = gradeItem(
        item,
        JSON.parse(String(existing.response_json)) as ItemResponse,
        chapter.misconceptions,
      );
    } else {
      if (attempt.status !== "in_progress") {
        throw new ReviewError(409, "This attempt is already completed.", "ALREADY_COMPLETED");
      }
      try {
        graded = gradeItem(item, input.response, chapter.misconceptions);
      } catch (e) {
        throw new ReviewError(400, e instanceof Error ? e.message : "Invalid answer format");
      }
      const now = new Date().toISOString();
      await tx.execute({
        sql: `INSERT INTO review_item_responses(
          attempt_id, student_id, form_level, checkpoint_id, item_id, position,
          skill, response_json, score, correct, confidence, misconception, time_ms, answered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          attemptId,
          sid,
          activeForm,
          checkpoint.id,
          item.id,
          position,
          item.skill,
          JSON.stringify(input.response),
          graded.score,
          graded.correct ? 1 : 0,
          confidence,
          graded.misconception,
          boundedTimeMs,
          now,
        ],
      });
    }

    const totals = (
      await tx.execute({
        sql: "SELECT COUNT(*) AS cnt, COALESCE(SUM(score), 0) AS pts, COALESCE(SUM(time_ms), 0) AS dur FROM review_item_responses WHERE attempt_id = ?",
        args: [attemptId],
      })
    ).rows[0];
    const answeredCount = Number(totals?.cnt ?? 0);
    const pointsEarned = Math.round(Number(totals?.pts ?? 0) * 100) / 100;
    const durationMs = Number(totals?.dur ?? 0);
    const pointsMax = itemIds.length;
    const isComplete = answeredCount >= pointsMax;

    if (isComplete && attempt.status === "in_progress") {
      const scorePct = Math.round((pointsEarned / pointsMax) * 100);
      const passed = scorePct >= PASS_PERCENT ? 1 : 0;
      const now = new Date().toISOString();
      await tx.execute({
        sql: `UPDATE review_attempts
              SET status = 'completed', score_pct = ?, points_earned = ?, duration_ms = ?, passed = ?, completed_at = ?
              WHERE id = ?`,
        args: [scorePct, pointsEarned, durationMs, passed, now, attemptId],
      });
      return {
        itemId: item.id,
        result: graded,
        completed: true,
        summary: {
          scorePct,
          passed: passed === 1,
          stars: starsForScore(scorePct),
          pointsEarned,
          pointsMax,
          durationMs,
          nextCheckpoint:
            passed === 1 ? findNextCheckpointAfter(curriculum, checkpoint.id) : null,
        },
      };
    }

    if (attempt.status === "in_progress") {
      await tx.execute({
        sql: "UPDATE review_attempts SET points_earned = ?, duration_ms = ? WHERE id = ?",
        args: [pointsEarned, durationMs, attemptId],
      });
    }

    if (attempt.status === "completed") {
      const pct = Number(attempt.score_pct ?? Math.round((pointsEarned / pointsMax) * 100));
      return {
        itemId: item.id,
        result: graded,
        completed: true,
        summary: {
          scorePct: pct,
          passed: pct >= PASS_PERCENT,
          stars: starsForScore(pct),
          pointsEarned,
          pointsMax,
          durationMs,
          nextCheckpoint:
            pct >= PASS_PERCENT ? findNextCheckpointAfter(curriculum, checkpoint.id) : null,
        },
      };
    }

    return {
      itemId: item.id,
      result: graded,
      completed: false,
      summary: null,
    };
  });
}

/** Tutor action: grant or revoke an explicit unlock on a station/checkpoint. */
export async function setTutorCheckpointUnlock(input: {
  studentId: number;
  formLevel: FormLevel;
  checkpointId: string;
  unlocked: boolean;
}) {
  await requireAdminActor();
  const sid = safeStudentId(input.studentId);
  const form = Number(input.formLevel) as FormLevel;
  if (![1, 2, 3, 4, 5].includes(form)) {
    throw new ReviewError(400, "Form level must be between 1 and 5.");
  }
  const curriculum = curriculumFor(form);
  if (!curriculum || !findCheckpoint(curriculum, input.checkpointId)) {
    throw new ReviewError(400, "Unknown checkpoint for that Form.");
  }
  return withTransaction(async (tx) => {
    const stu = (
      await tx.execute({ sql: "SELECT id FROM students WHERE id = ?", args: [sid] })
    ).rows[0];
    if (!stu) throw new ReviewError(404, "Student not found.");
    if (input.unlocked) {
      await tx.execute({
        sql: "INSERT OR REPLACE INTO review_unlocks(student_id, form_level, checkpoint_id, unlocked_at) VALUES (?, ?, ?, ?)",
        args: [sid, form, input.checkpointId, new Date().toISOString()],
      });
    } else {
      await tx.execute({
        sql: "DELETE FROM review_unlocks WHERE student_id = ? AND form_level = ? AND checkpoint_id = ?",
        args: [sid, form, input.checkpointId],
      });
    }
    return { success: true };
  });
}

/** Tutor action: assign or promote a student's Form (`Form 1`..`Form 5`), keeping historical progress intact. */
export async function setStudentReviewForm(input: {
  studentId: number;
  formLevel: FormLevel;
}) {
  await requireAdminActor();
  const sid = safeStudentId(input.studentId);
  const form = Number(input.formLevel) as FormLevel;
  if (![1, 2, 3, 4, 5].includes(form)) {
    throw new ReviewError(400, "Form level must be between 1 and 5.");
  }
  const label = `Form ${form}`;
  return withTransaction(async (tx) => {
    const stu = (
      await tx.execute({ sql: "SELECT id FROM students WHERE id = ?", args: [sid] })
    ).rows[0];
    if (!stu) throw new ReviewError(404, "Student not found.");
    await tx.execute({
      sql: "UPDATE students SET grade_level = ? WHERE id = ?",
      args: [label, sid],
    });
    return { success: true, gradeLevel: label, form };
  });
}

// ============================================================================
// TEACHER ANALYTICS & LEARNER INTELLIGENCE
// ============================================================================

export type TeacherOverviewRow = {
  studentId: number;
  studentName: string;
  active: boolean;
  gradeLevel: string | null;
  form: FormLevel | null;
  curriculumReady: boolean;
  passedCheckpoints: number;
  totalCheckpoints: number;
  masteryPct: number;
  completedAttempts: number;
  accuracyPct: number | null;
  studyDurationMs: number;
  struggleCount: number;
  blindSpotCount: number;
  lastActiveAt: string | null;
};

export async function getTeacherReviewOverview(): Promise<{
  students: TeacherOverviewRow[];
  availableForms: FormLevel[];
}> {
  await requireAdminActor();
  const [students, attemptAgg, respAgg] = await Promise.all([
    queryAll<StudentRow>(
      "SELECT id, name, grade_level, active FROM students ORDER BY active DESC, name ASC",
    ),
    queryAll<{
      student_id: number;
      form_level: number;
      checkpoint_id: string;
      attempts: number;
      best_pct: number | null;
      dur_ms: number;
      last_at: string | null;
    }>(
      `SELECT student_id, form_level, checkpoint_id,
              COUNT(*) AS attempts,
              MAX(score_pct) AS best_pct,
              COALESCE(SUM(duration_ms), 0) AS dur_ms,
              MAX(completed_at) AS last_at
       FROM review_attempts
       WHERE status = 'completed'
       GROUP BY student_id, form_level, checkpoint_id`,
    ),
    queryAll<{
      student_id: number;
      form_level: number;
      total_q: number;
      correct_q: number;
      blind_spots: number;
    }>(
      `SELECT student_id, form_level,
              COUNT(*) AS total_q,
              COALESCE(SUM(correct), 0) AS correct_q,
              COALESCE(SUM(CASE WHEN confidence = 'sure' AND correct = 0 THEN 1 ELSE 0 END), 0) AS blind_spots
       FROM review_item_responses
       GROUP BY student_id, form_level`,
    ),
  ]);

  const forms = availableForms();
  const rows: TeacherOverviewRow[] = students.map((s) => {
    const form = parseForm(s.grade_level);
    const curriculum = curriculumFor(form);
    const totalCheckpoints = curriculum
      ? curriculum.chapters.reduce((sum, c) => sum + c.checkpoints.length, 0)
      : 0;
    const cpRows = form
      ? attemptAgg.filter((a) => Number(a.student_id) === s.id && Number(a.form_level) === form)
      : [];
    const passedCheckpoints = cpRows.filter((c) => Number(c.best_pct ?? 0) >= PASS_PERCENT).length;
    const struggleCount = cpRows.filter(
      (c) => Number(c.attempts) >= 2 && Number(c.best_pct ?? 0) < PASS_PERCENT,
    ).length;
    const completedAttempts = cpRows.reduce((sum, c) => sum + Number(c.attempts), 0);
    const studyDurationMs = cpRows.reduce((sum, c) => sum + Number(c.dur_ms), 0);
    const lastActiveAt = cpRows
      .map((c) => c.last_at)
      .filter((x): x is string => !!x)
      .sort()
      .at(-1) ?? null;
    const rq = form
      ? respAgg.find((r) => Number(r.student_id) === s.id && Number(r.form_level) === form)
      : undefined;
    const accuracyPct =
      rq && Number(rq.total_q) > 0
        ? Math.round((Number(rq.correct_q) / Number(rq.total_q)) * 100)
        : null;
    return {
      studentId: s.id,
      studentName: s.name,
      active: !!s.active,
      gradeLevel: s.grade_level,
      form,
      curriculumReady: !!curriculum,
      passedCheckpoints,
      totalCheckpoints,
      masteryPct: totalCheckpoints
        ? Math.round((passedCheckpoints / totalCheckpoints) * 100)
        : 0,
      completedAttempts,
      accuracyPct,
      studyDurationMs,
      struggleCount,
      blindSpotCount: Number(rq?.blind_spots ?? 0),
      lastActiveAt,
    };
  });

  return { students: rows, availableForms: forms };
}

export type TutorRecommendation = {
  severity: "critical" | "focus" | "spaced" | "strength";
  title: string;
  detail: string;
  action: string;
  checkpointCode?: string;
};

export type SkillMetric = {
  skill: Skill;
  label: string;
  attempts: number;
  correct: number;
  accuracyPct: number | null;
  firstTryAccuracyPct: number | null;
  avgTimeMs: number | null;
  blindSpots: number;
};

export type MisconceptionInsight = {
  tag: string;
  description: string;
  chapterTitle: string;
  occurrences: number;
  unresolvedItems: number;
  resolvedItems: number;
  affectedCodes: string[];
};

export type ItemDeepDive = {
  itemId: string;
  checkpointId: string;
  checkpointCode: string;
  checkpointTitle: string;
  chapterNumber: number;
  skill: Skill;
  kind: string;
  prompt: string;
  code?: string;
  solution: string;
  totalAttempts: number;
  wrongAttempts: number;
  /** Number of tries taken to get it right for the first time (null = never got right yet!). */
  attemptsToFirstCorrect: number | null;
  currentlyMastered: boolean;
  latestConfidence: Confidence | null;
  blindSpot: boolean;
  fragile: boolean;
  firstTimeMs: number;
  latestTimeMs: number;
  misconceptionTag: string | null;
  misconceptionDesc: string | null;
  history: Array<{
    attemptNumber: number;
    answeredAt: string;
    correct: boolean;
    score: number;
    responseSummary: string;
    confidence: Confidence | null;
    timeMs: number;
    misconception: string | null;
  }>;
};

export type TeacherStudentReport = {
  student: {
    id: number;
    name: string;
    active: boolean;
    gradeLevel: string | null;
    assignedForm: FormLevel | null;
  };
  viewingForm: FormLevel | null;
  historicalForms: FormLevel[];
  availableForms: FormLevel[];
  curriculumReady: boolean;
  overview: null | {
    subject: string;
    passedCheckpoints: number;
    totalCheckpoints: number;
    masteryPct: number;
    totalStars: number;
    maxStars: number;
    completedAttempts: number;
    inProgressAttempts: number;
    firstTryPassRatePct: number | null;
    avgNormalisedGainPct: number | null;
    overallItemAccuracyPct: number | null;
    totalStudyTimeMs: number;
    avgCheckpointTimeMs: number | null;
    calibration: {
      totalWithConfidence: number;
      sureCorrect: number;
      sureWrong: number;
      unsureCorrect: number;
      unsureWrong: number;
    };
  };
  recommendations: TutorRecommendation[];
  skills: SkillMetric[];
  misconceptions: MisconceptionInsight[];
  chapters: Array<{
    id: string;
    number: number;
    title: string;
    titleMs: string;
    theme: ThemeId;
    unlocked: boolean;
    passedCount: number;
    totalCount: number;
    checkpoints: Array<
      CheckpointProgressSummary & {
        code: string;
        title: string;
        titleMs: string;
        boss: boolean;
        gameName: string;
        objective: string;
        normalisedGainPct: number | null;
        attemptHistory: Array<{
          id: number;
          attemptNumber: number;
          status: string;
          scorePct: number | null;
          passed: boolean;
          pointsEarned: number;
          pointsMax: number;
          durationMs: number;
          startedAt: string;
          completedAt: string | null;
        }>;
      }
    >;
  }>;
  items: ItemDeepDive[];
};

const SKILL_LABELS: Record<Skill, string> = {
  recall: "Recall (Facts & Terms)",
  understand: "Understand (Classify & Explain)",
  apply: "Apply (Convert & Calculate)",
  trace: "Trace (Predict Output)",
  debug: "Debug (Find & Fix Errors)",
  analyse: "Analyse (Decompose & Design)",
};

export async function getTeacherStudentReviewReport(
  studentId: number,
  requestedForm?: FormLevel | null,
): Promise<TeacherStudentReport> {
  await requireAdminActor();
  const sid = safeStudentId(studentId);
  const student = await queryOne<StudentRow>(
    "SELECT id, name, grade_level, active FROM students WHERE id = ?",
    [sid],
  );
  if (!student) {
    throw new ReviewError(404, "Student not found.", "STUDENT_NOT_FOUND");
  }

  const assignedForm = parseForm(student.grade_level);
  const distinctForms = await queryAll<{ form_level: number }>(
    "SELECT DISTINCT form_level FROM review_attempts WHERE student_id = ? ORDER BY form_level ASC",
    [sid],
  );
  const formSet = new Set<FormLevel>();
  if (assignedForm) formSet.add(assignedForm);
  for (const r of distinctForms) {
    if ([1, 2, 3, 4, 5].includes(Number(r.form_level))) {
      formSet.add(Number(r.form_level) as FormLevel);
    }
  }
  const historicalForms = [...formSet].sort() as FormLevel[];
  const viewingForm =
    requestedForm && [1, 2, 3, 4, 5].includes(requestedForm)
      ? requestedForm
      : assignedForm ?? historicalForms.at(-1) ?? null;

  const forms = availableForms();
  const curriculum = curriculumFor(viewingForm);
  if (!viewingForm || !curriculum) {
    return {
      student: {
        id: student.id,
        name: student.name,
        active: !!student.active,
        gradeLevel: student.grade_level,
        assignedForm,
      },
      viewingForm,
      historicalForms,
      availableForms: forms,
      curriculumReady: false,
      overview: null,
      recommendations: [],
      skills: [],
      misconceptions: [],
      chapters: [],
      items: [],
    };
  }

  const [mapView, allAttempts, allResponses] = await Promise.all([
    buildCurriculumProgress(sid, curriculum),
    queryAll<AttemptRow>(
      "SELECT * FROM review_attempts WHERE student_id = ? AND form_level = ? ORDER BY attempt_number ASC, id ASC",
      [sid, viewingForm],
    ),
    queryAll<ResponseRow & { attempt_number: number }>(
      `SELECT r.*, a.attempt_number
       FROM review_item_responses r
       JOIN review_attempts a ON a.id = r.attempt_id
       WHERE r.student_id = ? AND r.form_level = ?
       ORDER BY r.answered_at ASC, r.id ASC`,
      [sid, viewingForm] as InValue[],
    ),
  ]);

  const idxMap = itemIndex(curriculum);
  const attemptsByCp = new Map<string, AttemptRow[]>();
  for (const a of allAttempts) {
    const list = attemptsByCp.get(a.checkpoint_id) ?? [];
    list.push(a);
    attemptsByCp.set(a.checkpoint_id, list);
  }

  const completedAttempts = allAttempts.filter((a) => a.status === "completed");
  const inProgressAttempts = allAttempts.filter((a) => a.status === "in_progress");
  const totalStudyTimeMs = allResponses.reduce((s, r) => s + (Number(r.time_ms) || 0), 0);
  const avgCheckpointTimeMs = completedAttempts.length
    ? Math.round(
        completedAttempts.reduce((s, a) => s + (Number(a.duration_ms) || 0), 0) /
          completedAttempts.length,
      )
    : null;

  // First-try pass rate & normalised learning gain on retried checkpoints
  let cpsAttempted = 0;
  let cpsPassedFirstTry = 0;
  const gains: number[] = [];

  const chapters = mapView.chapters.map((ch) => {
    const rawChapter = findChapter(curriculum, ch.id)!;
    return {
      id: ch.id,
      number: ch.number,
      title: ch.title,
      titleMs: ch.titleMs,
      theme: ch.theme,
      unlocked: ch.unlocked,
      passedCount: ch.passedCount,
      totalCount: ch.totalCount,
      checkpoints: ch.checkpoints.map((cp) => {
        const rawCp = rawChapter.checkpoints.find((x) => x.id === cp.checkpointId)!;
        const list = attemptsByCp.get(cp.checkpointId) ?? [];
        const comp = list.filter((a) => a.status === "completed");
        let normalisedGainPct: number | null = null;
        if (comp.length >= 1) {
          cpsAttempted++;
          if ((comp[0].score_pct ?? 0) >= PASS_PERCENT) cpsPassedFirstTry++;
        }
        if (comp.length >= 2) {
          const pre = comp[0].score_pct ?? 0;
          const post = Math.max(...comp.map((a) => a.score_pct ?? 0));
          if (pre < 100) {
            normalisedGainPct = Math.round(((post - pre) / (100 - pre)) * 100);
            gains.push(normalisedGainPct);
          }
        }
        return {
          ...cp,
          objective: rawCp.objective,
          normalisedGainPct,
          attemptHistory: list.map((a) => ({
            id: Number(a.id),
            attemptNumber: Number(a.attempt_number),
            status: a.status,
            scorePct: a.score_pct !== null ? Number(a.score_pct) : null,
            passed: Number(a.passed) === 1,
            pointsEarned: Number(a.points_earned),
            pointsMax: Number(a.points_max),
            durationMs: Number(a.duration_ms),
            startedAt: a.started_at,
            completedAt: a.completed_at,
          })),
        };
      }),
    };
  });

  // Calibration & per-skill & per-item deep-dive
  const calibration = {
    totalWithConfidence: 0,
    sureCorrect: 0,
    sureWrong: 0,
    unsureCorrect: 0,
    unsureWrong: 0,
  };

  const skillOrder: Skill[] = ["recall", "understand", "apply", "trace", "debug", "analyse"];
  const skillAcc = new Map<
    Skill,
    { attempts: number; correct: number; firstTotal: number; firstCorrect: number; timeSum: number; blindSpots: number }
  >();
  for (const sk of skillOrder) {
    skillAcc.set(sk, { attempts: 0, correct: 0, firstTotal: 0, firstCorrect: 0, timeSum: 0, blindSpots: 0 });
  }

  const byItem = new Map<string, Array<ResponseRow & { attempt_number: number }>>();
  for (const r of allResponses) {
    const ok = Number(r.correct) === 1;
    if (r.confidence === "sure" || r.confidence === "unsure") {
      calibration.totalWithConfidence++;
      if (r.confidence === "sure" && ok) calibration.sureCorrect++;
      else if (r.confidence === "sure" && !ok) calibration.sureWrong++;
      else if (r.confidence === "unsure" && ok) calibration.unsureCorrect++;
      else calibration.unsureWrong++;
    }
    const sk = (r.skill as Skill) in SKILL_LABELS ? (r.skill as Skill) : "apply";
    const bucket = skillAcc.get(sk)!;
    bucket.attempts++;
    if (ok) bucket.correct++;
    bucket.timeSum += Number(r.time_ms) || 0;
    if (r.confidence === "sure" && !ok) bucket.blindSpots++;

    const arr = byItem.get(r.item_id) ?? [];
    arr.push(r);
    byItem.set(r.item_id, arr);
  }

  const misconceptionMap = new Map<
    string,
    {
      tag: string;
      description: string;
      chapterTitle: string;
      occurrences: number;
      unresolvedItems: Set<string>;
      resolvedItems: Set<string>;
      codes: Set<string>;
    }
  >();

  const items: ItemDeepDive[] = [];
  for (const [itemId, timeline] of byItem.entries()) {
    const meta = idxMap.get(itemId);
    if (!meta) continue;
    const { item, checkpoint, chapter } = meta;

    const first = timeline[0];
    const latest = timeline[timeline.length - 1];
    const skBucket = skillAcc.get(item.skill);
    if (skBucket) {
      skBucket.firstTotal++;
      if (Number(first.correct) === 1) skBucket.firstCorrect++;
    }

    const firstCorrectIdx = timeline.findIndex((t) => Number(t.correct) === 1);
    const attemptsToFirstCorrect = firstCorrectIdx >= 0 ? firstCorrectIdx + 1 : null;
    const currentlyMastered = Number(latest.correct) === 1;
    const wrongAttempts = timeline.filter((t) => Number(t.correct) === 0).length;

    let latestMisconceptionTag: string | null = null;
    for (const t of timeline) {
      if (t.misconception) {
        latestMisconceptionTag = t.misconception;
        const desc =
          chapter.misconceptions[t.misconception] ??
          "Specific conceptual error detected on this topic.";
        let rec = misconceptionMap.get(t.misconception);
        if (!rec) {
          rec = {
            tag: t.misconception,
            description: desc,
            chapterTitle: `Ch ${chapter.number}: ${chapter.title}`,
            occurrences: 0,
            unresolvedItems: new Set(),
            resolvedItems: new Set(),
            codes: new Set(),
          };
          misconceptionMap.set(t.misconception, rec);
        }
        rec.occurrences++;
        rec.codes.add(checkpoint.code);
        if (currentlyMastered) rec.resolvedItems.add(itemId);
        else rec.unresolvedItems.add(itemId);
      }
    }

    const sampleGrade = gradeItem(
      item,
      JSON.parse(String(latest.response_json)) as ItemResponse,
      chapter.misconceptions,
    );

    items.push({
      itemId,
      checkpointId: checkpoint.id,
      checkpointCode: checkpoint.code,
      checkpointTitle: checkpoint.title,
      chapterNumber: chapter.number,
      skill: item.skill,
      kind: item.kind,
      prompt: item.prompt,
      code: item.code,
      solution: sampleGrade.solution,
      totalAttempts: timeline.length,
      wrongAttempts,
      attemptsToFirstCorrect,
      currentlyMastered,
      latestConfidence: (latest.confidence as Confidence | null) ?? null,
      blindSpot: !currentlyMastered && latest.confidence === "sure",
      fragile: currentlyMastered && latest.confidence === "unsure",
      firstTimeMs: Number(first.time_ms) || 0,
      latestTimeMs: Number(latest.time_ms) || 0,
      misconceptionTag: latestMisconceptionTag,
      misconceptionDesc: latestMisconceptionTag
        ? (chapter.misconceptions[latestMisconceptionTag] ?? null)
        : null,
      history: timeline.map((t) => ({
        attemptNumber: Number(t.attempt_number),
        answeredAt: t.answered_at,
        correct: Number(t.correct) === 1,
        score: Number(t.score),
        responseSummary: describeResponse(
          item,
          JSON.parse(String(t.response_json)) as ItemResponse,
        ),
        confidence: (t.confidence as Confidence | null) ?? null,
        timeMs: Number(t.time_ms) || 0,
        misconception: t.misconception ?? null,
      })),
    });
  }

  // Sort items so unresolved & multi-attempt struggles surface right at the top
  items.sort((a, b) => {
    if (a.currentlyMastered !== b.currentlyMastered) return a.currentlyMastered ? 1 : -1;
    if (a.blindSpot !== b.blindSpot) return a.blindSpot ? -1 : 1;
    if (b.wrongAttempts !== a.wrongAttempts) return b.wrongAttempts - a.wrongAttempts;
    return b.totalAttempts - a.totalAttempts;
  });

  const misconceptions: MisconceptionInsight[] = [...misconceptionMap.values()]
    .map((m) => ({
      tag: m.tag,
      description: m.description,
      chapterTitle: m.chapterTitle,
      occurrences: m.occurrences,
      unresolvedItems: m.unresolvedItems.size,
      resolvedItems: [...m.resolvedItems].filter((x) => !m.unresolvedItems.has(x)).length,
      affectedCodes: [...m.codes].sort(),
    }))
    .sort((a, b) => b.unresolvedItems - a.unresolvedItems || b.occurrences - a.occurrences);

  const skills: SkillMetric[] = skillOrder.map((sk) => {
    const b = skillAcc.get(sk)!;
    return {
      skill: sk,
      label: SKILL_LABELS[sk],
      attempts: b.attempts,
      correct: b.correct,
      accuracyPct: b.attempts ? Math.round((b.correct / b.attempts) * 100) : null,
      firstTryAccuracyPct: b.firstTotal
        ? Math.round((b.firstCorrect / b.firstTotal) * 100)
        : null,
      avgTimeMs: b.attempts ? Math.round(b.timeSum / b.attempts) : null,
      blindSpots: b.blindSpots,
    };
  });

  // Synthesise ranked teacher action recommendations
  const recommendations: TutorRecommendation[] = [];
  for (const ch of chapters) {
    for (const cp of ch.checkpoints) {
      if (cp.attempts >= 2 && !cp.passed) {
        recommendations.push({
          severity: "critical",
          checkpointCode: cp.code,
          title: `Blocked at ${cp.code} ${cp.title} (${cp.attempts} attempts, best ${cp.bestScore ?? 0}%)`,
          detail: `Student is stuck below the ${PASS_PERCENT}% pass gate and cannot unlock the next checkpoint.`,
          action: `Co-play 2–3 missed questions from ${cp.code} using verbal "explain your thinking" before their next retry.`,
        });
      }
    }
  }

  for (const m of misconceptions.slice(0, 3)) {
    if (m.unresolvedItems > 0 || m.occurrences >= 2) {
      recommendations.push({
        severity: m.unresolvedItems > 0 ? "critical" : "focus",
        checkpointCode: m.affectedCodes[0],
        title: `Misconception pattern (${m.occurrences}× in ${m.affectedCodes.join(", ")})`,
        detail: m.description,
        action:
          m.unresolvedItems > 0
            ? `${m.unresolvedItems} question(s) still unresolved — address this mental model explicitly with a worked counter-example.`
            : "Student self-corrected on retry, but revisit briefly next week to verify retention.",
      });
    }
  }

  const blindSpotItems = items.filter((i) => i.blindSpot);
  if (blindSpotItems.length > 0) {
    recommendations.push({
      severity: "focus",
      checkpointCode: blindSpotItems[0].checkpointCode,
      title: `${blindSpotItems.length} high-confidence error${blindSpotItems.length > 1 ? "s" : ""} ("I'm sure" + wrong)`,
      detail: `Student answered confidently yet incorrectly on ${blindSpotItems
        .slice(0, 3)
        .map((i) => i.checkpointCode)
        .join(", ")} — a classic sign of an entrenched misconception rather than a slip.`,
      action: "Ask the student to predict & justify their answer out loud before showing why the rule differs.",
    });
  }

  const weakestSkill = skills
    .filter((s) => s.attempts >= 4 && s.accuracyPct !== null && s.accuracyPct < 70)
    .sort((a, b) => (a.accuracyPct ?? 100) - (b.accuracyPct ?? 100))[0];
  if (weakestSkill) {
    recommendations.push({
      severity: "focus",
      title: `Skill gap in ${weakestSkill.label} (${weakestSkill.accuracyPct}% accuracy)`,
      detail: `Across ${weakestSkill.attempts} items, ${weakestSkill.label.split(" ")[0]} lags behind recall/recognition.`,
      action: "Shift live lesson time from definition recall to live trace tables, PRIMM predictions, or Bug Hunt.",
    });
  }

  const nowMs = Date.now();
  const stalePassed = chapters
    .flatMap((c) => c.checkpoints)
    .filter((cp) => {
      if (!cp.passed || !cp.lastPlayedAt) return false;
      const days = (nowMs - new Date(cp.lastPlayedAt).getTime()) / 86_400_000;
      return days >= 7;
    });
  if (stalePassed.length > 0) {
    recommendations.push({
      severity: "spaced",
      checkpointCode: stalePassed[0].code,
      title: `${stalePassed.length} mastered checkpoint${stalePassed.length > 1 ? "s" : ""} ready for weekly spaced retrieval`,
      detail: `Last practised ≥ 7 days ago (${stalePassed
        .slice(0, 3)
        .map((c) => c.code)
        .join(", ")}). Distributed practice cements long-term exam retention.`,
      action: "Assign a quick 5-minute replay warm-up to beat their personal best time/stars.",
    });
  }

  const strongestSkill = skills
    .filter((s) => s.attempts >= 4 && (s.accuracyPct ?? 0) >= 85)
    .sort((a, b) => (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0))[0];
  if (strongestSkill) {
    recommendations.push({
      severity: "strength",
      title: `Strong fluency in ${strongestSkill.label} (${strongestSkill.accuracyPct}%)`,
      detail: `Consistent accuracy across ${strongestSkill.attempts} questions (avg ${Math.round((strongestSkill.avgTimeMs ?? 0) / 1000)}s/item).`,
      action: "Challenge the learner to invent 1 tricky question of their own (Quiz Creator strategy).",
    });
  }

  const totalAnswered = allResponses.length;
  const totalCorrect = allResponses.filter((r) => Number(r.correct) === 1).length;

  return {
    student: {
      id: student.id,
      name: student.name,
      active: !!student.active,
      gradeLevel: student.grade_level,
      assignedForm,
    },
    viewingForm,
    historicalForms,
    availableForms: forms,
    curriculumReady: true,
    overview: {
      subject: curriculum.subject,
      passedCheckpoints: mapView.passedCheckpoints,
      totalCheckpoints: mapView.totalCheckpoints,
      masteryPct: mapView.totalCheckpoints
        ? Math.round((mapView.passedCheckpoints / mapView.totalCheckpoints) * 100)
        : 0,
      totalStars: mapView.totalStars,
      maxStars: mapView.maxStars,
      completedAttempts: completedAttempts.length,
      inProgressAttempts: inProgressAttempts.length,
      firstTryPassRatePct: cpsAttempted
        ? Math.round((cpsPassedFirstTry / cpsAttempted) * 100)
        : null,
      avgNormalisedGainPct: gains.length
        ? Math.round(gains.reduce((s, g) => s + g, 0) / gains.length)
        : null,
      overallItemAccuracyPct: totalAnswered
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : null,
      totalStudyTimeMs,
      avgCheckpointTimeMs,
      calibration,
    },
    recommendations,
    skills,
    misconceptions,
    chapters,
    items,
  };
}
