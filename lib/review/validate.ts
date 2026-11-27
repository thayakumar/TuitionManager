import type { Checkpoint, Item } from "./types";
import { GAMES, MAX_PLAY_SECONDS, MIN_PLAY_SECONDS, SECONDS_PER_KIND } from "./games";

/** Estimated seconds for one attempt: average item time in the pool × draw. */
export function estimateSeconds(checkpoint: Checkpoint): number {
  if (!checkpoint.items.length) return 0;
  const total = checkpoint.items.reduce((sum, item) => sum + SECONDS_PER_KIND[item.kind], 0);
  return Math.round((total / checkpoint.items.length) * checkpoint.draw);
}

function uniq(values: string[]) {
  return new Set(values).size === values.length;
}

function itemErrors(item: Item, misconceptions: Record<string, string>): string[] {
  const errors: string[] = [];
  const tag = (t: string | undefined, where: string) => {
    if (t !== undefined && !(t in misconceptions)) errors.push(`${item.id}: unknown misconception "${t}" (${where})`);
  };
  if (!item.prompt?.trim()) errors.push(`${item.id}: empty prompt`);
  if (!item.explanation?.trim()) errors.push(`${item.id}: empty explanation`);
  switch (item.kind) {
    case "mcq":
      if (item.options.length < 3 || item.options.length > 5) errors.push(`${item.id}: mcq needs 3-5 options`);
      if (!uniq(item.options.map((o) => o.id))) errors.push(`${item.id}: duplicate option ids`);
      if (!uniq(item.options.map((o) => o.text.trim()))) errors.push(`${item.id}: duplicate option text`);
      if (!item.options.some((o) => o.id === item.answer)) errors.push(`${item.id}: answer not in options`);
      item.options.forEach((o) => tag(o.misconception, `option ${o.id}`));
      if (item.options.find((o) => o.id === item.answer)?.misconception) errors.push(`${item.id}: correct option must not carry a misconception`);
      break;
    case "multi":
      if (item.options.length < 4 || item.options.length > 7) errors.push(`${item.id}: multi needs 4-7 options`);
      if (!uniq(item.options.map((o) => o.id))) errors.push(`${item.id}: duplicate option ids`);
      if (!item.answer.length || item.answer.length >= item.options.length) errors.push(`${item.id}: multi needs 1..options-1 answers`);
      if (!item.answer.every((a) => item.options.some((o) => o.id === a))) errors.push(`${item.id}: answer not in options`);
      item.options.forEach((o) => tag(o.misconception, `option ${o.id}`));
      break;
    case "order":
      if (item.steps.length < 3 || item.steps.length > 9) errors.push(`${item.id}: order needs 3-9 steps`);
      if (!uniq(item.steps.map((s) => s.id))) errors.push(`${item.id}: duplicate step ids`);
      if (!uniq(item.steps.map((s) => s.text.trim()))) errors.push(`${item.id}: duplicate step text makes order ambiguous`);
      tag(item.misconception, "order");
      break;
    case "match":
      if (item.pairs.length < 3 || item.pairs.length > 6) errors.push(`${item.id}: match needs 3-6 pairs`);
      if (!uniq(item.pairs.map((p) => p.id))) errors.push(`${item.id}: duplicate pair ids`);
      if (!uniq(item.pairs.map((p) => p.left.trim())) || !uniq(item.pairs.map((p) => p.right.trim())))
        errors.push(`${item.id}: duplicate pair text`);
      break;
    case "sort":
      if (item.buckets.length < 2 || item.buckets.length > 4) errors.push(`${item.id}: sort needs 2-4 buckets`);
      if (item.cards.length < 4 || item.cards.length > 10) errors.push(`${item.id}: sort needs 4-10 cards`);
      if (!uniq(item.buckets.map((b) => b.id)) || !uniq(item.cards.map((c) => c.id))) errors.push(`${item.id}: duplicate ids`);
      if (!uniq(item.cards.map((c) => c.text.trim()))) errors.push(`${item.id}: duplicate card text`);
      for (const c of item.cards) {
        if (!item.buckets.some((b) => b.id === c.bucket)) errors.push(`${item.id}: card ${c.id} has unknown bucket`);
        tag(c.misconception, `card ${c.id}`);
      }
      break;
    case "input":
      if (!item.accept.length || item.accept.some((a) => !a.trim())) errors.push(`${item.id}: input needs accepted answers`);
      for (const t of item.traps ?? []) {
        tag(t.misconception, `trap ${t.answer}`);
        if (item.accept.some((a) => a.trim().toLowerCase() === t.answer.trim().toLowerCase()))
          errors.push(`${item.id}: trap equals an accepted answer`);
      }
      break;
    case "bug":
      if (item.lines.length < 3 || item.lines.length > 14) errors.push(`${item.id}: bug needs 3-14 lines`);
      if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.lines.length) errors.push(`${item.id}: bug answer out of range`);
      for (const [index, t] of Object.entries(item.lineTraps ?? {})) {
        tag(t, `line ${index}`);
        if (Number(index) === item.answer) errors.push(`${item.id}: lineTrap on the correct line`);
      }
      break;
    case "binary":
      if (item.bits < 3 || item.bits > 8) errors.push(`${item.id}: binary needs 3-8 bits`);
      if (!Number.isInteger(item.target) || item.target < 0 || item.target >= 2 ** item.bits) errors.push(`${item.id}: binary target does not fit`);
      break;
  }
  return errors;
}

/** Validate checkpoints authored for one chapter part. Returns human-readable errors. */
export function validateCheckpoints(
  checkpoints: Checkpoint[],
  misconceptions: Record<string, string>,
  seenItemIds: Set<string> = new Set(),
): string[] {
  const errors: string[] = [];
  const seenCheckpoints = new Set<string>();
  for (const cp of checkpoints) {
    if (seenCheckpoints.has(cp.id)) errors.push(`duplicate checkpoint ${cp.id}`);
    seenCheckpoints.add(cp.id);
    const game = GAMES[cp.game];
    if (!game) {
      errors.push(`${cp.id}: unknown game ${cp.game}`);
      continue;
    }
    if (!cp.title?.trim() || !cp.titleMs?.trim() || !cp.objective?.trim()) errors.push(`${cp.id}: missing title/titleMs/objective`);
    if (!Number.isInteger(cp.draw) || cp.draw < 5) errors.push(`${cp.id}: draw must be an integer >= 5`);
    if (cp.items.length < cp.draw + 2) errors.push(`${cp.id}: pool (${cp.items.length}) must be at least draw + 2 (${cp.draw + 2})`);
    const seconds = estimateSeconds(cp);
    if (seconds < MIN_PLAY_SECONDS || seconds > MAX_PLAY_SECONDS)
      errors.push(`${cp.id}: estimated ${seconds}s is outside ${MIN_PLAY_SECONDS}-${MAX_PLAY_SECONDS}s (adjust draw or item mix)`);
    for (const item of cp.items) {
      if (seenItemIds.has(item.id)) errors.push(`duplicate item id ${item.id}`);
      seenItemIds.add(item.id);
      if (!game.kinds.includes(item.kind)) errors.push(`${item.id}: kind "${item.kind}" not allowed in game ${cp.game}`);
      errors.push(...itemErrors(item, misconceptions));
    }
    const skills = new Set(cp.items.map((i) => i.skill));
    if (cp.items.length >= 10 && skills.size < 2) errors.push(`${cp.id}: use at least two skills so the teacher sees depth, not just recall`);
  }
  return errors;
}
