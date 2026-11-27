import type { GameId, ItemKind } from "./types";

/**
 * Game catalogue, chosen from the CS Online Revision Game Toolkit (ASK Forms 1-3).
 * Each game is a thin shell around one evidence-backed cognitive task; the
 * shell stays light because gamification alone shows ~zero effect for
 * secondary students (Li et al., 2023, g = 0.014). The task is what matters.
 */
export type GameInfo = {
  id: GameId;
  name: string;
  tagline: string;
  /** How to play, shown on the checkpoint intro. */
  howTo: string;
  /** Why this game for this kind of objective (teacher view). */
  evidence: string;
  kinds: ItemKind[];
  /** Lucide icon name rendered by the UI. */
  icon: string;
};

export const GAMES: Record<GameId, GameInfo> = {
  "recall-blast": {
    id: "recall-blast",
    name: "Recall Blast",
    tagline: "Pull it from memory, fast.",
    howTo: "Answer each question from memory. Pick an answer, then tell us if you're sure.",
    evidence: "Practice testing beats restudying (Adesope et al., 2017, g = 0.51); retrieval is rated high-utility (Dunlosky et al., 2013).",
    kinds: ["mcq", "multi", "input"],
    icon: "Zap",
  },
  "odd-one-out": {
    id: "odd-one-out",
    name: "Odd One Out",
    tagline: "Three belong together. One doesn't.",
    howTo: "Spot the item that does not fit the group. Think about why before you tap.",
    evidence: "Category-boundary judgements force elaborative interrogation and pattern recognition (toolkit activity #10).",
    kinds: ["mcq", "multi"],
    icon: "Shapes",
  },
  "group-sort": {
    id: "group-sort",
    name: "Group Sort",
    tagline: "Drop every card in the right basket.",
    howTo: "Tap a card, then tap the basket it belongs in. Get every card home.",
    evidence: "Classification reveals fuzzy concept boundaries; Wordwall Group Sort pattern (toolkit #22).",
    kinds: ["sort", "mcq"],
    icon: "LayoutGrid",
  },
  "match-up": {
    id: "match-up",
    name: "Match Up",
    tagline: "Connect each term to its meaning.",
    howTo: "Tap something on the left, then its partner on the right.",
    evidence: "Paired-associate retrieval for terminology; low cognitive load for revision warm-ups.",
    kinds: ["match", "mcq"],
    icon: "Link2",
  },
  "bit-flipper": {
    id: "bit-flipper",
    name: "Bit Flipper",
    tagline: "Flip the switches to build the number.",
    howTo: "Each switch is a bit. Turn bits on and off until the value matches the target.",
    evidence: "Manipulating place values makes the 2ⁿ weights concrete before abstract conversion (Binary Speed Round, toolkit).",
    kinds: ["binary", "input", "mcq"],
    icon: "ToggleRight",
  },
  "conversion-sprint": {
    id: "conversion-sprint",
    name: "Conversion Sprint",
    tagline: "Work it out, type the answer.",
    howTo: "Calculate and type the answer. Show your working on paper if it helps.",
    evidence: "Constructed-response practice avoids MCQ elimination tricks; timed conversion challenges (toolkit Form 1 map).",
    kinds: ["input", "mcq"],
    icon: "Calculator",
  },
  "rank-order": {
    id: "rank-order",
    name: "Rank Order",
    tagline: "Line them up in the right order.",
    howTo: "Drag (or use the arrows) to put the items in order, then check.",
    evidence: "Ordering tasks test relational understanding, e.g. Data Unit Ordering Race (toolkit #19).",
    kinds: ["order", "mcq"],
    icon: "ListOrdered",
  },
  parsons: {
    id: "parsons",
    name: "Parsons Puzzle",
    tagline: "Unscramble the algorithm.",
    howTo: "The lines are mixed up. Put them back in the order that makes the algorithm work.",
    evidence: "Parsons problems give the same learning as writing code in significantly less time (Ericson et al., 2017).",
    kinds: ["order", "mcq"],
    icon: "Puzzle",
  },
  "trace-predict": {
    id: "trace-predict",
    name: "Trace & Predict",
    tagline: "Run it in your head. What happens?",
    howTo: "Read the steps carefully and predict the output before you answer.",
    evidence: "Tracing is a prerequisite for writing code (Lister et al., 2004); the Predict step of PRIMM (Sentance et al., 2019).",
    kinds: ["mcq", "input"],
    icon: "Footprints",
  },
  "bug-hunt": {
    id: "bug-hunt",
    name: "Bug Hunt",
    tagline: "Find the line that breaks it.",
    howTo: "One line is wrong. Tap it. Some rounds ask what kind of error it is.",
    evidence: "Debugging interventions g = 0.64; game-based debugging g = 0.94 (Sun et al., 2024).",
    kinds: ["bug", "mcq"],
    icon: "Bug",
  },
  "code-complete": {
    id: "code-complete",
    name: "Code Complete",
    tagline: "Fill in the missing piece.",
    howTo: "Something is missing. Type or pick what goes in the gap.",
    evidence: "Worked examples with fading reduce cognitive load while still requiring construction (toolkit #9).",
    kinds: ["input", "mcq", "order"],
    icon: "TextCursorInput",
  },
  "escape-room": {
    id: "escape-room",
    name: "Escape Room",
    tagline: "Every lock needs a different skill.",
    howTo: "Mixed challenges from the whole section. Clear the rooms to escape.",
    evidence: "Interleaved, multi-skill retrieval improves discrimination between problem types (toolkit #12, Mini Escape Room).",
    kinds: ["mcq", "multi", "order", "match", "sort", "input", "bug", "binary"],
    icon: "DoorOpen",
  },
};

/** Estimated seconds per item kind, used to keep a checkpoint within 5-8 minutes. */
export const SECONDS_PER_KIND: Record<ItemKind, number> = {
  mcq: 30,
  multi: 40,
  input: 40,
  binary: 40,
  bug: 45,
  match: 60,
  sort: 60,
  order: 60,
};

export const PASS_PERCENT = 80;
export const MIN_PLAY_SECONDS = 300;
export const MAX_PLAY_SECONDS = 480;
