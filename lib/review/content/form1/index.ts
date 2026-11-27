import type { Chapter, Curriculum } from "../../types";
import * as ch1 from "./ch1";
import * as ch2a from "./ch2a";
import * as ch2b from "./ch2b";
import * as ch3 from "./ch3";
import * as ch4a from "./ch4a";
import * as ch4b from "./ch4b";
import * as ch4c from "./ch4c";

/**
 * Tingkatan 1 Asas Sains Komputer (Buku Teks KSSM "Asas Sains Komputer Tingkatan 1").
 * Setiap bab mewakili satu stesen pulau pada peta pengembaraan.
 */
const chapters: Chapter[] = [
  {
    id: "f1-ch1",
    number: 1,
    title: "Konsep Asas Pemikiran Komputasional",
    titleMs: "Konsep Asas Pemikiran Komputasional",
    theme: "meadow",
    blurb: "Pecahkan masalah, kenal pasti corak, kekalkan aspek penting dan bina model penyelesaian.",
    misconceptions: { ...ch1.misconceptions },
    checkpoints: ch1.checkpoints,
  },
  {
    id: "f1-ch2",
    number: 2,
    title: "Perwakilan Data",
    titleMs: "Perwakilan Data",
    theme: "lagoon",
    blurb: "Sistem nombor perduaan, pengekodan ASCII serta ukuran saiz fail imej dan audio digital.",
    misconceptions: { ...ch2a.misconceptions, ...ch2b.misconceptions },
    checkpoints: [...ch2a.checkpoints, ...ch2b.checkpoints],
  },
  {
    id: "f1-ch3",
    number: 3,
    title: "Algoritma",
    titleMs: "Algoritma",
    theme: "frost",
    blurb: "Pseudokod dan carta alir yang melibatkan struktur kawalan pilihan, ulangan serta semakan meja.",
    misconceptions: { ...ch3.misconceptions },
    checkpoints: ch3.checkpoints,
  },
  {
    id: "f1-ch4",
    number: 4,
    title: "Kod Arahan",
    titleMs: "Kod Arahan",
    theme: "candy",
    blurb: "Pengaturcaraan Scratch 2.0, fasa pembangunan atur cara dan pembinaan laman sesawang HTML.",
    misconceptions: { ...ch4a.misconceptions, ...ch4b.misconceptions, ...ch4c.misconceptions },
    checkpoints: [...ch4a.checkpoints, ...ch4b.checkpoints, ...ch4c.checkpoints],
  },
];

export const form1: Curriculum = {
  form: 1,
  subject: "Asas Sains Komputer",
  version: "f1-v2-bm",
  chapters,
};
