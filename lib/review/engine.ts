import type {
  ClientItem,
  Curriculum,
  GradeResult,
  Item,
  ItemResponse,
} from "./types";
import { PASS_PERCENT } from "./games";

/** Mulberry32 deterministic PRNG for reproducible shuffles per attempt. */
export function rng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw `count` items for a new attempt, prioritising unseen or previously
 * missed items before already-mastered items while keeping order varied.
 */
export function selectAttemptItems(
  pool: readonly Item[],
  count: number,
  seed: number,
  missedIds: ReadonlySet<string> = new Set(),
  seenIds: ReadonlySet<string> = new Set(),
): string[] {
  const rand = rng(seed);
  const missed: Item[] = [];
  const unseen: Item[] = [];
  const mastered: Item[] = [];
  for (const item of pool) {
    if (missedIds.has(item.id)) missed.push(item);
    else if (!seenIds.has(item.id)) unseen.push(item);
    else mastered.push(item);
  }
  const ordered = [
    ...shuffleWith(missed, rand),
    ...shuffleWith(unseen, rand),
    ...shuffleWith(mastered, rand),
  ].slice(0, Math.min(count, pool.length));
  return shuffleWith(ordered, rand).map((i) => i.id);
}

/** Strip every answer key and diagnostic tag before sending an item to the client. */
export function toClientItem(item: Item, seed: number): ClientItem {
  const rand = rng(seed);
  switch (item.kind) {
    case "mcq":
      return {
        id: item.id,
        kind: "mcq",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        options: shuffleWith(
          item.options.map((o) => ({ id: o.id, text: o.text })),
          rand,
        ),
      };
    case "multi":
      return {
        id: item.id,
        kind: "multi",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        pick: item.answer.length,
        options: shuffleWith(
          item.options.map((o) => ({ id: o.id, text: o.text })),
          rand,
        ),
      };
    case "order": {
      let steps = shuffleWith(item.steps, rand);
      if (
        steps.length > 1 &&
        steps.every((s, idx) => s.id === item.steps[idx].id)
      ) {
        steps = [...steps.slice(1), steps[0]];
      }
      return {
        id: item.id,
        kind: "order",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        steps,
      };
    }
    case "match": {
      const left = shuffleWith(
        item.pairs.map((p) => ({ id: p.id, text: p.left })),
        rand,
      );
      let right = shuffleWith(
        item.pairs.map((p) => ({ id: p.id, text: p.right })),
        rand,
      );
      if (right.length > 1 && right.every((r, idx) => r.id === left[idx].id)) {
        right = [...right.slice(1), right[0]];
      }
      return {
        id: item.id,
        kind: "match",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        left,
        right,
      };
    }
    case "sort":
      return {
        id: item.id,
        kind: "sort",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        buckets: item.buckets.map((b) => ({ id: b.id, label: b.label })),
        cards: shuffleWith(
          item.cards.map((c) => ({ id: c.id, text: c.text })),
          rand,
        ),
      };
    case "input":
      return {
        id: item.id,
        kind: "input",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        inputMode: item.inputMode,
        placeholder: item.placeholder,
      };
    case "bug":
      return {
        id: item.id,
        kind: "bug",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        lines: [...item.lines],
      };
    case "binary":
      return {
        id: item.id,
        kind: "binary",
        skill: item.skill,
        prompt: item.prompt,
        code: item.code,
        bits: item.bits,
        target: item.target,
      };
  }
}

function normInput(raw: string, numeric = false): string {
  let s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (numeric) {
    s = s.replace(/,/g, "").replace(/₂|₁₀/g, "");
  }
  return s;
}

export function describeResponse(item: Item, response: ItemResponse): string {
  switch (item.kind) {
    case "mcq": {
      if (response.kind !== "mcq") return "—";
      return item.options.find((o) => o.id === response.choice)?.text ?? response.choice;
    }
    case "multi": {
      if (response.kind !== "multi") return "—";
      return response.choices
        .map((id) => item.options.find((o) => o.id === id)?.text ?? id)
        .join("; ");
    }
    case "order": {
      if (response.kind !== "order") return "—";
      return response.order
        .map((id) => item.steps.find((s) => s.id === id)?.text ?? id)
        .join(" → ");
    }
    case "match": {
      if (response.kind !== "match") return "—";
      return Object.entries(response.pairs)
        .map(([l, r]) => {
          const lp = item.pairs.find((p) => p.id === l)?.left ?? l;
          const rp = item.pairs.find((p) => p.id === r)?.right ?? r;
          return `${lp} = ${rp}`;
        })
        .join(" | ");
    }
    case "sort": {
      if (response.kind !== "sort") return "—";
      const wrong = item.cards.filter((c) => response.placement[c.id] !== c.bucket);
      if (!wrong.length) return "All cards sorted accurately";
      return `Misplaced: ${wrong
        .map((c) => {
          const picked = item.buckets.find((b) => b.id === response.placement[c.id])?.label ?? "?";
          return `${c.text} → ${picked}`;
        })
        .join(", ")}`;
    }
    case "input":
      return response.kind === "input" ? response.value.trim() || "(empty)" : "—";
    case "bug":
      return response.kind === "bug"
        ? `Line ${response.line + 1}: ${item.lines[response.line] ?? "?"}`
        : "—";
    case "binary":
      return response.kind === "binary" ? `${response.value}₂` : "—";
  }
}

export function gradeItem(
  item: Item,
  response: ItemResponse,
  chapterMisconceptions: Record<string, string> = {},
): GradeResult {
  if (response.kind !== item.kind) {
    throw new Error(`Expected response kind "${item.kind}", received "${response.kind}"`);
  }
  switch (item.kind) {
    case "mcq": {
      const r = response as Extract<ItemResponse, { kind: "mcq" }>;
      const picked = item.options.find((o) => o.id === r.choice);
      const right = item.options.find((o) => o.id === item.answer)!;
      const correct = r.choice === item.answer;
      return {
        score: correct ? 1 : 0,
        correct,
        misconception: correct ? null : (picked?.misconception ?? null),
        solution: right.text,
        explanation: item.explanation,
      };
    }
    case "multi": {
      const r = response as Extract<ItemResponse, { kind: "multi" }>;
      const chosen = new Set(r.choices);
      const answerSet = new Set(item.answer);
      let hits = 0;
      let wrong = 0;
      let misconception: string | null = null;
      for (const id of chosen) {
        if (answerSet.has(id)) hits++;
        else {
          wrong++;
          const opt = item.options.find((o) => o.id === id);
          if (!misconception && opt?.misconception) misconception = opt.misconception;
        }
      }
      const raw = Math.max(0, (hits - wrong) / item.answer.length);
      const correct = hits === item.answer.length && wrong === 0;
      return {
        score: correct ? 1 : Math.round(raw * 100) / 100,
        correct,
        misconception: correct ? null : misconception,
        solution: item.options
          .filter((o) => answerSet.has(o.id))
          .map((o) => o.text)
          .join(" • "),
        explanation: item.explanation,
      };
    }
    case "order": {
      const r = response as Extract<ItemResponse, { kind: "order" }>;
      const expected = item.steps.map((s) => s.id);
      const correct =
        r.order.length === expected.length &&
        r.order.every((id, idx) => id === expected[idx]);
      return {
        score: correct ? 1 : 0,
        correct,
        misconception: correct ? null : (item.misconception ?? null),
        solution: item.steps.map((s, i) => `${i + 1}. ${s.text}`).join("  "),
        explanation: item.explanation,
      };
    }
    case "match": {
      const r = response as Extract<ItemResponse, { kind: "match" }>;
      let hits = 0;
      for (const p of item.pairs) {
        if (r.pairs?.[p.id] === p.id) hits++;
      }
      const correct = hits === item.pairs.length;
      return {
        score: Math.round((hits / item.pairs.length) * 100) / 100,
        correct,
        misconception: null,
        solution: item.pairs.map((p) => `${p.left} → ${p.right}`).join(" • "),
        explanation: item.explanation,
      };
    }
    case "sort": {
      const r = response as Extract<ItemResponse, { kind: "sort" }>;
      let hits = 0;
      let misconception: string | null = null;
      for (const c of item.cards) {
        if (r.placement?.[c.id] === c.bucket) hits++;
        else if (!misconception && c.misconception) misconception = c.misconception;
      }
      const correct = hits === item.cards.length;
      return {
        score: Math.round((hits / item.cards.length) * 100) / 100,
        correct,
        misconception: correct ? null : misconception,
        solution: item.buckets
          .map(
            (b) =>
              `${b.label}: ${item.cards
                .filter((c) => c.bucket === b.id)
                .map((c) => c.text)
                .join(", ")}`,
          )
          .join(" | "),
        explanation: item.explanation,
      };
    }
    case "input": {
      const r = response as Extract<ItemResponse, { kind: "input" }>;
      const numeric = item.inputMode === "numeric";
      const val = normInput(r.value, numeric);
      const correct = item.accept.some((a) => normInput(a, numeric) === val);
      let misconception: string | null = null;
      if (!correct && item.traps) {
        const hit = item.traps.find((t) => normInput(t.answer, numeric) === val);
        if (hit) misconception = hit.misconception;
      }
      return {
        score: correct ? 1 : 0,
        correct,
        misconception,
        solution: item.accept[0],
        explanation: item.explanation,
      };
    }
    case "bug": {
      const r = response as Extract<ItemResponse, { kind: "bug" }>;
      const correct = r.line === item.answer;
      const trap = !correct ? item.lineTraps?.[String(r.line)] ?? null : null;
      return {
        score: correct ? 1 : 0,
        correct,
        misconception: trap,
        solution: `Line ${item.answer + 1}: ${item.lines[item.answer]}`,
        explanation: item.explanation,
      };
    }
    case "binary": {
      const r = response as Extract<ItemResponse, { kind: "binary" }>;
      const clean = String(r.value ?? "").replace(/[^01]/g, "");
      const targetStr = item.target.toString(2).padStart(item.bits, "0");
      const correct = clean.length === item.bits && clean === targetStr;
      let misconception: string | null = null;
      if (!correct && clean.length === item.bits) {
        const rev = clean.split("").reverse().join("");
        if (rev === targetStr && "bin-weights-reversed" in chapterMisconceptions) {
          misconception = "bin-weights-reversed";
        }
      }
      return {
        score: correct ? 1 : 0,
        correct,
        misconception,
        solution: `${targetStr}₂ (${item.target}₁₀)`,
        explanation: item.explanation,
      };
    }
  }
}

export function starsForScore(bestScore: number | null): 0 | 1 | 2 | 3 {
  if (bestScore === null || bestScore < PASS_PERCENT) return 0;
  if (bestScore >= 100) return 3;
  if (bestScore >= 90) return 2;
  return 1;
}

export type CheckpointProgressSummary = {
  checkpointId: string;
  attempts: number;
  bestScore: number | null;
  firstScore: number | null;
  lastScore: number | null;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  unlocked: boolean;
  tutorUnlocked: boolean;
  inProgressAttemptId: number | null;
  bestDurationMs: number | null;
  avgDurationMs: number | null;
  lastPlayedAt: string | null;
};

/**
 * Sequential unlocking across the curriculum:
 * - First checkpoint of Chapter 1 is always unlocked.
 * - Checkpoint k unlocks as soon as checkpoint k - 1 is passed (>= 80%), OR
 *   when the tutor explicitly unlocked checkpoint k in `review_unlocks`.
 */
export function computeUnlockMap(
  curriculum: Curriculum,
  passedIds: ReadonlySet<string>,
  tutorUnlockedIds: ReadonlySet<string>,
): Map<string, boolean> {
  const flat = curriculum.chapters.flatMap((ch) => ch.checkpoints);
  const unlocked = new Map<string, boolean>();
  for (let i = 0; i < flat.length; i++) {
    const cp = flat[i];
    const open =
      i === 0 ||
      tutorUnlockedIds.has(cp.id) ||
      passedIds.has(flat[i - 1].id);
    unlocked.set(cp.id, open);
  }
  return unlocked;
}
