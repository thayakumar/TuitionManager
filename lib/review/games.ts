import type { GameId, ItemKind } from "./types";

/**
 * Katalog permainan ulang kaji berdasarkan CS Online Revision Game Toolkit (ASK Tingkatan 1–3).
 * Setiap mod permainan membalut tugasan kognitif berbukti kajian pendidikan sains komputer.
 */
export type GameInfo = {
  id: GameId;
  name: string;
  tagline: string;
  /** Panduan ringkas cara bermain untuk murid. */
  howTo: string;
  /** Rasional pedagogi untuk paparan guru. */
  evidence: string;
  kinds: ItemKind[];
  /** Nama ikon Lucide. */
  icon: string;
};

export const GAMES: Record<GameId, GameInfo> = {
  "recall-blast": {
    id: "recall-blast",
    name: "Recall Blast",
    tagline: "Imbas kembali konsep penting dengan pantas.",
    howTo: "Jawab setiap soalan berdasarkan ingatan dan pemahaman, kemudian nyatakan tahap keyakinan anda.",
    evidence: "Practice testing beats restudying (Adesope et al., 2017, g = 0.51); retrieval is rated high-utility (Dunlosky et al., 2013).",
    kinds: ["mcq", "multi", "input"],
    icon: "Zap",
  },
  "odd-one-out": {
    id: "odd-one-out",
    name: "Odd One Out",
    tagline: "Tiga berkongsi corak yang sama, satu berbeza.",
    howTo: "Kenal pasti pilihan yang tidak sepadan dengan kumpulan yang lain dan fikirkan sebabnya.",
    evidence: "Category-boundary judgements force elaborative interrogation and pattern recognition (toolkit activity #10).",
    kinds: ["mcq", "multi"],
    icon: "Shapes",
  },
  "group-sort": {
    id: "group-sort",
    name: "Group Sort",
    tagline: "Masukkan setiap kad ke dalam kategori yang betul.",
    howTo: "Tekan sekeping kad, kemudian tekan bakul kategori yang sepadan sehingga semua kad selesai diasingkan.",
    evidence: "Classification reveals fuzzy concept boundaries; Wordwall Group Sort pattern (toolkit #22).",
    kinds: ["sort", "mcq"],
    icon: "LayoutGrid",
  },
  "match-up": {
    id: "match-up",
    name: "Match Up",
    tagline: "Padankan setiap istilah dengan maksud atau fungsinya.",
    howTo: "Tekan kad di sebelah kiri, kemudian tekan pasangan yang betul di sebelah kanan.",
    evidence: "Paired-associate retrieval for terminology; low cognitive load for revision warm-ups.",
    kinds: ["match", "mcq"],
    icon: "Link2",
  },
  "bit-flipper": {
    id: "bit-flipper",
    name: "Bit Flipper",
    tagline: "Tukar suis bit untuk membina nilai sasaran.",
    howTo: "Setiap suis mewakili satu nilai tempat kuasa dua (2ⁿ). Hidupkan atau matikan bit sehingga jumlahnya menyamai sasaran.",
    evidence: "Manipulating place values makes the 2ⁿ weights concrete before abstract conversion (Binary Speed Round, toolkit).",
    kinds: ["binary", "input", "mcq"],
    icon: "ToggleRight",
  },
  "conversion-sprint": {
    id: "conversion-sprint",
    name: "Conversion Sprint",
    tagline: "Kira dengan teliti dan taipkan jawapan tepat.",
    howTo: "Selesaikan pengiraan penukaran dan taip jawapan anda. Gunakan kertas conteng jika perlu.",
    evidence: "Constructed-response practice avoids MCQ elimination tricks; timed conversion challenges (toolkit Form 1 map).",
    kinds: ["input", "mcq"],
    icon: "Calculator",
  },
  "rank-order": {
    id: "rank-order",
    name: "Rank Order",
    tagline: "Susun item mengikut urutan secara tertib.",
    howTo: "Tukar kedudukan blok atau gunakan anak panah Atas/Bawah untuk menyusun mengikut tertib yang betul.",
    evidence: "Ordering tasks test relational understanding, e.g. Data Unit Ordering Race (toolkit #19).",
    kinds: ["order", "mcq"],
    icon: "ListOrdered",
  },
  parsons: {
    id: "parsons",
    name: "Parsons Puzzle",
    tagline: "Susun semula baris algoritma atau kod arahan.",
    howTo: "Baris pseudokod atau kod telah dikocok. Susun semula mengikut urutan logik supaya berfungsi dengan betul.",
    evidence: "Parsons problems give the same learning as writing code in significantly less time (Ericson et al., 2017).",
    kinds: ["order", "mcq"],
    icon: "Puzzle",
  },
  "trace-predict": {
    id: "trace-predict",
    name: "Trace & Predict",
    tagline: "Lakukan semakan meja dan ramalkan output.",
    howTo: "Jejak pelaksanaan langkah demi langkah dengan teliti dan ramalkan nilai atau paparan akhir.",
    evidence: "Tracing is a prerequisite for writing code (Lister et al., 2004); the Predict step of PRIMM (Sentance et al., 2019).",
    kinds: ["mcq", "input"],
    icon: "Footprints",
  },
  "bug-hunt": {
    id: "bug-hunt",
    name: "Bug Hunt",
    tagline: "Cari baris yang mengandungi ralat.",
    howTo: "Salah satu baris mempunyai kesilapan logik atau sintaks. Tekan baris yang bermasalah tersebut.",
    evidence: "Debugging interventions g = 0.64; game-based debugging g = 0.94 (Sun et al., 2024).",
    kinds: ["bug", "mcq"],
    icon: "Bug",
  },
  "code-complete": {
    id: "code-complete",
    name: "Code Complete",
    tagline: "Lengkapkan bahagian kod atau nilai yang kosong.",
    howTo: "Teliti struktur kod atau algoritma yang diberikan, kemudian taip atau pilih bahagian yang tertinggal.",
    evidence: "Worked examples with fading reduce cognitive load while still requiring construction (toolkit #9).",
    kinds: ["input", "mcq", "order"],
    icon: "TextCursorInput",
  },
  "escape-room": {
    id: "escape-room",
    name: "Escape Room",
    tagline: "Setiap kunci menguji kemahiran berbeza.",
    howTo: "Cabaran gabungan merangkumi keseluruhan bab. Buka semua kunci dengan skor sekurang-kurangnya 80%!",
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
