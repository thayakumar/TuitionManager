import type { Chapter, Curriculum } from "../../types";
import * as ch1 from "./ch1";
import * as ch2a from "./ch2a";
import * as ch2b from "./ch2b";
import * as ch3 from "./ch3";
import * as ch4a from "./ch4a";
import * as ch4b from "./ch4b";
import * as ch4c from "./ch4c";

/**
 * Form 1 Asas Sains Komputer (KSSM textbook "Asas Komputer Tingkatan 1").
 * Chapter = station on the world map. Each chapter has its own visual theme.
 */
const chapters: Chapter[] = [
  {
    id: "f1-ch1",
    number: 1,
    title: "Computational Thinking",
    titleMs: "Konsep Asas Pemikiran Komputasional",
    theme: "meadow",
    blurb: "Break problems down, spot patterns, keep what matters.",
    misconceptions: { ...ch1.misconceptions },
    checkpoints: ch1.checkpoints,
  },
  {
    id: "f1-ch2",
    number: 2,
    title: "Data Representation",
    titleMs: "Perwakilan Data",
    theme: "lagoon",
    blurb: "Binary numbers, ASCII and how big your files really are.",
    misconceptions: { ...ch2a.misconceptions, ...ch2b.misconceptions },
    checkpoints: [...ch2a.checkpoints, ...ch2b.checkpoints],
  },
  {
    id: "f1-ch3",
    number: 3,
    title: "Algorithms",
    titleMs: "Algoritma",
    theme: "frost",
    blurb: "Pseudocode and flowcharts with choices and loops.",
    misconceptions: { ...ch3.misconceptions },
    checkpoints: ch3.checkpoints,
  },
  {
    id: "f1-ch4",
    number: 4,
    title: "Code",
    titleMs: "Kod Arahan",
    theme: "candy",
    blurb: "Scratch programs and your first HTML web pages.",
    misconceptions: { ...ch4a.misconceptions, ...ch4b.misconceptions, ...ch4c.misconceptions },
    checkpoints: [...ch4a.checkpoints, ...ch4b.checkpoints, ...ch4c.checkpoints],
  },
];

export const form1: Curriculum = {
  form: 1,
  subject: "Asas Sains Komputer",
  version: "f1-v1",
  chapters,
};
