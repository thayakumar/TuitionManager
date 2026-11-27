/**
 * Review Quest content model.
 *
 * A form (Tingkatan) has chapters ("stations" on the world map). Each chapter
 * has an ordered list of checkpoints: one per leaf subtopic (e.g. 2.1.3) plus a
 * section "boss" checkpoint (e.g. 2.1) that interleaves everything in that
 * section. Every checkpoint plays exactly one game, drawing `draw` items from
 * its item pool so retries are not pure memorisation.
 *
 * Answers live only on the server. The client receives `ClientItem`s that have
 * every answer key stripped (see lib/review/engine.ts).
 */

export type FormLevel = 1 | 2 | 3 | 4 | 5;

/** Cognitive demand, used for the teacher's skill profile. */
export type Skill =
  | "recall" // terminology, symbols, facts
  | "understand" // explain/classify/compare
  | "apply" // carry out a procedure (convert, calculate)
  | "trace" // predict output / follow an algorithm
  | "debug" // find/classify/fix an error
  | "analyse"; // decompose, pattern, abstraction, design choice

export type GameId =
  | "recall-blast"
  | "odd-one-out"
  | "group-sort"
  | "match-up"
  | "bit-flipper"
  | "conversion-sprint"
  | "rank-order"
  | "parsons"
  | "trace-predict"
  | "bug-hunt"
  | "code-complete"
  | "escape-room";

export type ThemeId = "meadow" | "lagoon" | "frost" | "candy" | "desert" | "volcano";

type ItemBase = {
  /** Globally unique and stable, e.g. "f1-2.1.3-q04". Never reuse an id for different content. */
  id: string;
  skill: Skill;
  /** Question text. Plain text; use \n for line breaks. */
  prompt: string;
  /** Optional monospace block (pseudocode, Scratch blocks as text, HTML). */
  code?: string;
  /** Shown after answering, right or wrong. Teach the idea in 1-3 sentences. */
  explanation: string;
};

export type Choice = {
  id: string;
  text: string;
  /** Misconception tag (key of Chapter.misconceptions) revealed by choosing this distractor. */
  misconception?: string;
};

/** Single correct answer. */
export type McqItem = ItemBase & { kind: "mcq"; options: Choice[]; answer: string };

/** Select every correct option. Partial credit = (hits - false picks) / answers, floored at 0. */
export type MultiItem = ItemBase & { kind: "multi"; options: Choice[]; answer: string[] };

/** Put steps in order. `steps` is authored IN THE CORRECT ORDER; the client shuffles. */
export type OrderItem = ItemBase & {
  kind: "order";
  steps: { id: string; text: string }[];
  /** Misconception when the student's order is wrong (optional). */
  misconception?: string;
};

/** Pair left with right. Partial credit = correct pairs / pairs. */
export type MatchItem = ItemBase & {
  kind: "match";
  pairs: { id: string; left: string; right: string }[];
};

/** Drop cards into buckets. Partial credit = correctly placed / cards. */
export type SortItem = ItemBase & {
  kind: "sort";
  buckets: { id: string; label: string }[];
  cards: { id: string; text: string; bucket: string; misconception?: string }[];
};

/** Typed answer. Matching is case-insensitive and whitespace-insensitive. */
export type InputItem = ItemBase & {
  kind: "input";
  accept: string[];
  inputMode?: "numeric" | "text";
  placeholder?: string;
  /** Known wrong answers that reveal a misconception. */
  traps?: { answer: string; misconception: string }[];
};

/** Tap the faulty line. `lines` are shown numbered; `answer` is the 0-based line index. */
export type BugItem = ItemBase & {
  kind: "bug";
  lines: string[];
  answer: number;
  /** Misconception when a specific wrong line is picked (0-based index -> tag). */
  lineTraps?: Record<string, string>;
};

/** Toggle bits (MSB first) so the binary value equals `target` (decimal). */
export type BinaryItem = ItemBase & {
  kind: "binary";
  bits: number;
  target: number;
};

export type Item =
  | McqItem
  | MultiItem
  | OrderItem
  | MatchItem
  | SortItem
  | InputItem
  | BugItem
  | BinaryItem;

export type ItemKind = Item["kind"];

export type Checkpoint = {
  /** Namespaced and stable: "f1-1.1.3" or boss "f1-1.1". */
  id: string;
  /** Syllabus code shown to students, e.g. "1.1.3". */
  code: string;
  /** English title (Malay term in parentheses where helpful). */
  title: string;
  /** Textbook Malay title. */
  titleMs: string;
  /** True for the section review (e.g. 2.1) that interleaves its children. */
  boss?: boolean;
  game: GameId;
  /** What the student must show, in teacher language. */
  objective: string;
  /** Items drawn per attempt. Validator keeps estimated play time within 5-8 minutes. */
  draw: number;
  items: Item[];
};

export type Chapter = {
  /** "f1-ch2" */
  id: string;
  number: number;
  title: string;
  titleMs: string;
  theme: ThemeId;
  /** Short line shown on the station card. */
  blurb: string;
  /** Misconception tag -> teacher-facing description. */
  misconceptions: Record<string, string>;
  checkpoints: Checkpoint[];
};

export type Curriculum = {
  form: FormLevel;
  subject: string;
  /** Bump when items change meaning so analytics can separate versions. */
  version: string;
  chapters: Chapter[];
};

// ---------- client-safe shapes (no answers) ----------

export type ClientItem =
  | (Omit<McqItem, "answer" | "explanation" | "options"> & { options: { id: string; text: string }[] })
  | (Omit<MultiItem, "answer" | "explanation" | "options"> & {
      options: { id: string; text: string }[];
      pick: number;
    })
  | (Omit<OrderItem, "explanation" | "misconception">)
  | { id: string; kind: "match"; skill: Skill; prompt: string; code?: string; left: { id: string; text: string }[]; right: { id: string; text: string }[] }
  | { id: string; kind: "sort"; skill: Skill; prompt: string; code?: string; buckets: { id: string; label: string }[]; cards: { id: string; text: string }[] }
  | (Omit<InputItem, "accept" | "explanation" | "traps">)
  | (Omit<BugItem, "answer" | "explanation" | "lineTraps">)
  | (Omit<BinaryItem, "explanation">);

/** What a student submits per item. */
export type ItemResponse =
  | { kind: "mcq"; choice: string }
  | { kind: "multi"; choices: string[] }
  | { kind: "order"; order: string[] }
  | { kind: "match"; pairs: Record<string, string> } // leftId -> rightId (pair ids)
  | { kind: "sort"; placement: Record<string, string> } // cardId -> bucketId
  | { kind: "input"; value: string }
  | { kind: "bug"; line: number }
  | { kind: "binary"; value: string }; // e.g. "00101101"

export type Confidence = "sure" | "unsure";

export type GradeResult = {
  score: number; // 0..1
  correct: boolean; // score === 1
  misconception: string | null;
  /** Human-readable correct answer for feedback. */
  solution: string;
  explanation: string;
};
