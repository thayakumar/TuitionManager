import { randomUUID } from "crypto";
import { queryAll, withTransaction } from "../db";
import { verifyAdminSession } from "../auth";
import { curriculumFor, findCheckpoint } from "./curriculum";
import { GAMES } from "./games";
import {
  extractItemTraps,
  formatItemAnswerKey,
  standardForCheckpoint,
  type LearningStandard,
} from "./standards";
import type {
  Checkpoint,
  Curriculum,
  FormLevel,
  GameId,
  Item,
  ItemKind,
} from "./types";

export class BankError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type BankOverrideRow = {
  id: string;
  form_level: number;
  checkpoint_id: string;
  op: "upsert" | "delete";
  item_json: string | null;
  misconceptions_json: string;
  updated_at: string;
};

async function requireAdmin(): Promise<void> {
  if (!(await verifyAdminSession())) {
    throw new BankError(403, "Tutor access required to manage the question bank.");
  }
}

/**
 * Overlay teacher-created, teacher-edited, and teacher-deleted questions onto
 * the static Form curriculum so gameplay, grading, analytics, and Teacher's
 * Guides all reflect live bank changes immediately.
 */
export async function loadEffectiveCurriculum(
  form: FormLevel | null,
): Promise<Curriculum | null> {
  const base = curriculumFor(form);
  if (!base || !form) return null;

  const rows = await queryAll<BankOverrideRow>(
    "SELECT * FROM review_bank_items WHERE form_level = ? ORDER BY updated_at ASC, id ASC",
    [form],
  );
  if (rows.length === 0) return base;

  const byCp = new Map<string, BankOverrideRow[]>();
  for (const r of rows) {
    const list = byCp.get(r.checkpoint_id) ?? [];
    list.push(r);
    byCp.set(r.checkpoint_id, list);
  }

  return {
    ...base,
    chapters: base.chapters.map((ch) => {
      const mergedMisconceptions = { ...ch.misconceptions };
      const checkpoints: Checkpoint[] = ch.checkpoints.map((cp) => {
        const edits = byCp.get(cp.id);
        if (!edits || edits.length === 0) return cp;

        const deletedIds = new Set<string>();
        const replaced = new Map<string, Item>();
        const appended: Item[] = [];
        const builtinIds = new Set(cp.items.map((i) => i.id));

        for (const ed of edits) {
          try {
            const extraMisc = JSON.parse(ed.misconceptions_json || "{}") as Record<
              string,
              string
            >;
            for (const [k, v] of Object.entries(extraMisc)) {
              if (k && typeof v === "string" && v.trim()) {
                mergedMisconceptions[k] = v.trim();
              }
            }
          } catch {}

          if (ed.op === "delete") {
            deletedIds.add(ed.id);
            replaced.delete(ed.id);
          } else if (ed.op === "upsert" && ed.item_json) {
            try {
              const parsed = JSON.parse(ed.item_json) as Item;
              deletedIds.delete(ed.id);
              if (builtinIds.has(ed.id)) {
                replaced.set(ed.id, parsed);
              } else {
                const existingIdx = appended.findIndex((x) => x.id === parsed.id);
                if (existingIdx >= 0) appended[existingIdx] = parsed;
                else appended.push(parsed);
              }
            } catch {}
          }
        }

        const items: Item[] = [];
        for (const orig of cp.items) {
          if (deletedIds.has(orig.id)) continue;
          items.push(replaced.get(orig.id) ?? orig);
        }
        for (const extra of appended) {
          if (!deletedIds.has(extra.id)) items.push(extra);
        }

        const safeItems = items.length > 0 ? items : cp.items.slice(0, 1);
        return {
          ...cp,
          draw: Math.min(cp.draw, safeItems.length),
          items: safeItems,
        };
      });

      return {
        ...ch,
        misconceptions: mergedMisconceptions,
        checkpoints,
      };
    }),
  };
}

function uniq(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

export function validateBankItemCandidate(
  item: Item,
  allowedKinds: readonly ItemKind[],
): void {
  if (!allowedKinds.includes(item.kind)) {
    throw new BankError(
      400,
      `Question type "${item.kind}" is not supported by this checkpoint's game mode (allowed: ${allowedKinds.join(", ")}).`,
    );
  }
  if (!item.prompt || !item.prompt.trim()) {
    throw new BankError(400, "Question prompt is required.");
  }
  if (!item.explanation || !item.explanation.trim()) {
    throw new BankError(400, "Teaching explanation is required (shown to students after answering).");
  }
  const validSkills = ["recall", "understand", "apply", "trace", "debug", "analyse"];
  if (!validSkills.includes(item.skill)) {
    throw new BankError(400, "Choose a valid cognitive skill.");
  }

  switch (item.kind) {
    case "mcq": {
      if (!Array.isArray(item.options) || item.options.length < 3 || item.options.length > 5) {
        throw new BankError(400, "MCQ questions need between 3 and 5 options.");
      }
      if (item.options.some((o) => !o.text?.trim())) {
        throw new BankError(400, "Every MCQ option must have text.");
      }
      if (!uniq(item.options.map((o) => o.id)) || !uniq(item.options.map((o) => o.text.trim()))) {
        throw new BankError(400, "MCQ options must be distinct.");
      }
      if (!item.options.some((o) => o.id === item.answer)) {
        throw new BankError(400, "Select which MCQ option is the correct answer.");
      }
      const ansOpt = item.options.find((o) => o.id === item.answer);
      if (ansOpt?.misconception) {
        delete ansOpt.misconception;
      }
      break;
    }
    case "multi": {
      if (!Array.isArray(item.options) || item.options.length < 4 || item.options.length > 7) {
        throw new BankError(400, "Multi-select questions need between 4 and 7 options.");
      }
      if (item.options.some((o) => !o.text?.trim())) {
        throw new BankError(400, "Every option must have text.");
      }
      if (!Array.isArray(item.answer) || item.answer.length < 1 || item.answer.length >= item.options.length) {
        throw new BankError(400, "Select at least 1 correct option (and leave at least 1 distractor).");
      }
      break;
    }
    case "order": {
      if (!Array.isArray(item.steps) || item.steps.length < 3 || item.steps.length > 9) {
        throw new BankError(400, "Ordering / Parsons puzzles need between 3 and 9 steps.");
      }
      if (item.steps.some((s) => !s.text?.trim())) {
        throw new BankError(400, "Every ordered step must have text.");
      }
      if (!uniq(item.steps.map((s) => s.text.trim()))) {
        throw new BankError(400, "Each step in an ordering puzzle must have unique text so the order is unambiguous.");
      }
      break;
    }
    case "match": {
      if (!Array.isArray(item.pairs) || item.pairs.length < 3 || item.pairs.length > 6) {
        throw new BankError(400, "Match Up questions need between 3 and 6 pairs.");
      }
      if (item.pairs.some((p) => !p.left?.trim() || !p.right?.trim())) {
        throw new BankError(400, "Every pair needs both a left prompt and a right partner.");
      }
      if (!uniq(item.pairs.map((p) => p.left.trim())) || !uniq(item.pairs.map((p) => p.right.trim()))) {
        throw new BankError(400, "Left and right pair texts must be distinct.");
      }
      break;
    }
    case "sort": {
      if (!Array.isArray(item.buckets) || item.buckets.length < 2 || item.buckets.length > 4) {
        throw new BankError(400, "Group Sort needs between 2 and 4 baskets.");
      }
      if (!Array.isArray(item.cards) || item.cards.length < 4 || item.cards.length > 10) {
        throw new BankError(400, "Group Sort needs between 4 and 10 cards.");
      }
      if (item.buckets.some((b) => !b.label?.trim()) || item.cards.some((c) => !c.text?.trim())) {
        throw new BankError(400, "All baskets and cards must have text.");
      }
      if (!item.cards.every((c) => item.buckets.some((b) => b.id === c.bucket))) {
        throw new BankError(400, "Every card must be assigned to a valid basket.");
      }
      break;
    }
    case "input": {
      if (!Array.isArray(item.accept) || item.accept.length < 1 || item.accept.some((a) => !a?.trim())) {
        throw new BankError(400, "Provide at least one accepted answer.");
      }
      break;
    }
    case "bug": {
      if (!Array.isArray(item.lines) || item.lines.length < 3 || item.lines.length > 14) {
        throw new BankError(400, "Bug Hunt needs between 3 and 14 lines of code/steps.");
      }
      if (item.lines.some((l) => !l?.trim())) {
        throw new BankError(400, "Code lines cannot be empty.");
      }
      if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.lines.length) {
        throw new BankError(400, "Select which line number contains the bug.");
      }
      break;
    }
    case "binary": {
      if (!Number.isInteger(item.bits) || item.bits < 3 || item.bits > 8) {
        throw new BankError(400, "Bit Flipper requires between 3 and 8 bits.");
      }
      if (!Number.isInteger(item.target) || item.target < 0 || item.target >= 2 ** item.bits) {
        throw new BankError(
          400,
          `Target decimal value must fit in ${item.bits} bits (0 to ${2 ** item.bits - 1}).`,
        );
      }
      break;
    }
  }
}

export type BankStudioItemView = {
  id: string;
  source: "builtin" | "edited" | "custom" | "deleted";
  canRestoreBuiltin: boolean;
  item: Item;
  answerKey: string;
  traps: Array<{ trigger: string; tag: string; meaning: string }>;
};

export type BankStudioPayload = {
  form: FormLevel;
  subject: string;
  chapters: Array<{
    id: string;
    number: number;
    title: string;
    titleMs: string;
    misconceptions: Record<string, string>;
    checkpoints: Array<{
      id: string;
      code: string;
      title: string;
      titleMs: string;
      boss: boolean;
      objective: string;
      draw: number;
      activeCount: number;
      game: {
        id: GameId;
        name: string;
        tagline: string;
        evidence: string;
        allowedKinds: ItemKind[];
      };
      standard: LearningStandard;
      items: BankStudioItemView[];
    }>;
  }>;
};

export async function getTeacherQuestionBank(
  formLevel: FormLevel = 1,
): Promise<BankStudioPayload> {
  await requireAdmin();
  const base = curriculumFor(formLevel);
  if (!base) {
    throw new BankError(404, `Form ${formLevel} curriculum is not yet configured.`);
  }
  const overrides = await queryAll<BankOverrideRow>(
    "SELECT * FROM review_bank_items WHERE form_level = ? ORDER BY updated_at ASC, id ASC",
    [formLevel],
  );
  const byCp = new Map<string, BankOverrideRow[]>();
  for (const r of overrides) {
    const arr = byCp.get(r.checkpoint_id) ?? [];
    arr.push(r);
    byCp.set(r.checkpoint_id, arr);
  }

  return {
    form: base.form,
    subject: base.subject,
    chapters: base.chapters.map((ch) => {
      const misconceptions = { ...ch.misconceptions };
      for (const cp of ch.checkpoints) {
        for (const ed of byCp.get(cp.id) ?? []) {
          try {
            Object.assign(misconceptions, JSON.parse(ed.misconceptions_json || "{}"));
          } catch {}
        }
      }

      return {
        id: ch.id,
        number: ch.number,
        title: ch.title,
        titleMs: ch.titleMs,
        misconceptions,
        checkpoints: ch.checkpoints.map((cp) => {
          const edits = byCp.get(cp.id) ?? [];
          const editMap = new Map<string, BankOverrideRow>();
          for (const e of edits) editMap.set(e.id, e);
          const builtinIds = new Set(cp.items.map((i) => i.id));

          const views: BankStudioItemView[] = [];
          for (const orig of cp.items) {
            const ov = editMap.get(orig.id);
            if (!ov) {
              views.push({
                id: orig.id,
                source: "builtin",
                canRestoreBuiltin: false,
                item: orig,
                answerKey: formatItemAnswerKey(orig),
                traps: extractItemTraps(orig, misconceptions),
              });
            } else if (ov.op === "delete") {
              views.push({
                id: orig.id,
                source: "deleted",
                canRestoreBuiltin: true,
                item: orig,
                answerKey: formatItemAnswerKey(orig),
                traps: extractItemTraps(orig, misconceptions),
              });
            } else if (ov.item_json) {
              const edited = JSON.parse(ov.item_json) as Item;
              views.push({
                id: orig.id,
                source: "edited",
                canRestoreBuiltin: true,
                item: edited,
                answerKey: formatItemAnswerKey(edited),
                traps: extractItemTraps(edited, misconceptions),
              });
            }
          }

          for (const ed of edits) {
            if (!builtinIds.has(ed.id) && ed.op === "upsert" && ed.item_json) {
              const custom = JSON.parse(ed.item_json) as Item;
              views.push({
                id: custom.id,
                source: "custom",
                canRestoreBuiltin: false,
                item: custom,
                answerKey: formatItemAnswerKey(custom),
                traps: extractItemTraps(custom, misconceptions),
              });
            }
          }

          const activeCount = views.filter((v) => v.source !== "deleted").length;
          const g = GAMES[cp.game];
          return {
            id: cp.id,
            code: cp.code,
            title: cp.title,
            titleMs: cp.titleMs,
            boss: !!cp.boss,
            objective: cp.objective,
            draw: Math.min(cp.draw, activeCount),
            activeCount,
            game: {
              id: g.id,
              name: g.name,
              tagline: g.tagline,
              evidence: g.evidence,
              allowedKinds: g.kinds,
            },
            standard: standardForCheckpoint(cp),
            items: views,
          };
        }),
      };
    }),
  };
}

export async function saveTeacherBankItem(input: {
  formLevel: FormLevel;
  checkpointId: string;
  item: Item;
  misconceptions?: Record<string, string>;
}) {
  await requireAdmin();
  const form = Number(input.formLevel) as FormLevel;
  const base = curriculumFor(form);
  const located = base ? findCheckpoint(base, input.checkpointId) : null;
  if (!base || !located) {
    throw new BankError(404, "Checkpoint not found.");
  }
  const { checkpoint } = located;
  const game = GAMES[checkpoint.game];
  const candidate = { ...input.item };
  if (!candidate.id || !candidate.id.trim()) {
    candidate.id = `custom-${checkpoint.id}-${randomUUID().slice(0, 8)}`;
  }
  validateBankItemCandidate(candidate, game.kinds);

  const cleanMisc: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.misconceptions ?? {})) {
    if (k.trim() && typeof v === "string" && v.trim()) {
      cleanMisc[k.trim()] = v.trim();
    }
  }

  await withTransaction(async (tx) => {
    await tx.execute({
      sql: `INSERT OR REPLACE INTO review_bank_items(
              id, form_level, checkpoint_id, op, item_json, misconceptions_json, updated_at
            ) VALUES (?, ?, ?, 'upsert', ?, ?, ?)`,
      args: [
        candidate.id,
        form,
        checkpoint.id,
        JSON.stringify(candidate),
        JSON.stringify(cleanMisc),
        new Date().toISOString(),
      ],
    });
  });

  return { success: true, itemId: candidate.id };
}

export async function deleteTeacherBankItem(input: {
  formLevel: FormLevel;
  checkpointId: string;
  itemId: string;
}) {
  await requireAdmin();
  const form = Number(input.formLevel) as FormLevel;
  const eff = await loadEffectiveCurriculum(form);
  const located = eff ? findCheckpoint(eff, input.checkpointId) : null;
  if (!eff || !located) {
    throw new BankError(404, "Checkpoint not found.");
  }
  const active = located.checkpoint.items;
  if (active.some((i) => i.id === input.itemId) && active.length <= 5) {
    throw new BankError(
      400,
      "Each checkpoint must keep at least 5 active questions so the game stays playable. Add another question before deleting this one.",
    );
  }

  const base = curriculumFor(form)!;
  const baseCp = findCheckpoint(base, input.checkpointId)!.checkpoint;
  const isBuiltin = baseCp.items.some((i) => i.id === input.itemId);

  await withTransaction(async (tx) => {
    if (isBuiltin) {
      await tx.execute({
        sql: `INSERT OR REPLACE INTO review_bank_items(
                id, form_level, checkpoint_id, op, item_json, misconceptions_json, updated_at
              ) VALUES (?, ?, ?, 'delete', NULL, '{}', ?)`,
        args: [input.itemId, form, input.checkpointId, new Date().toISOString()],
      });
    } else {
      await tx.execute({
        sql: "DELETE FROM review_bank_items WHERE id = ? AND form_level = ? AND checkpoint_id = ?",
        args: [input.itemId, form, input.checkpointId],
      });
    }
  });

  return { success: true };
}

export async function restoreBuiltinBankItem(input: {
  formLevel: FormLevel;
  checkpointId: string;
  itemId: string;
}) {
  await requireAdmin();
  const form = Number(input.formLevel) as FormLevel;
  await withTransaction(async (tx) => {
    await tx.execute({
      sql: "DELETE FROM review_bank_items WHERE id = ? AND form_level = ? AND checkpoint_id = ?",
      args: [input.itemId, form, input.checkpointId],
    });
  });
  return { success: true };
}
