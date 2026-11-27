import type { Checkpoint, Item, Skill } from "./types";

export type LearningStandard = {
  /** KSSM DSKP Standard Kandungan (Content Standard), e.g. "1.1 Asas Pemikiran Komputasional" */
  standardKandungan: string;
  /** Official KSSM DSKP Standard Pembelajaran in Bahasa Melayu (verbatim from textbook) */
  standardPembelajaranMs: string;
  /** English translation of the Standard Pembelajaran */
  standardPembelajaranEn: string;
  /** Teacher-facing summary of what student mastery looks like & what is being measured */
  measuring: string;
};

export const FORM1_STANDARDS: Record<string, LearningStandard> = {
  "f1-1.1.1": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional",
    standardPembelajaranMs:
      "1.1.1 Menerangkan teknik Leraian (Decomposition), Pengecaman Corak (Pattern Recognition), Peniskalaan (Abstraction) dan Pengitlakan (Generalisation) dalam pemikiran komputasional untuk menyelesaikan masalah.",
    standardPembelajaranEn:
      "1.1.1 Explain Decomposition, Pattern Recognition, Abstraction and Generalisation techniques in computational thinking to solve problems.",
    measuring:
      "Ability to distinguish the 4 CT techniques by cognitive action rather than confusing leraian (splitting parts) with peniskalaan (filtering irrelevant detail), or pengecaman corak with pengitlakan.",
  },
  "f1-1.1.2": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional",
    standardPembelajaranMs:
      "1.1.2 Menyelesaikan sesuatu tugasan menggunakan teknik leraian dan menentukan langkah secara tertib.",
    standardPembelajaranEn:
      "1.1.2 Solve a task using decomposition and determine the steps in logical sequence (secara tertib).",
    measuring:
      "Ability to break compound problems into non-overlapping sub-tasks and sequence steps so prerequisites/inputs always precede dependent actions.",
  },
  "f1-1.1.3": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional",
    standardPembelajaranMs:
      "1.1.3 Mengesan unsur persamaan dan perbezaan untuk pengecaman corak dalam sesuatu situasi.",
    standardPembelajaranEn:
      "1.1.3 Detect similarities and differences for pattern recognition in a given situation.",
    measuring:
      "Ability to spot repeating trends, second-order differences, cyclic rules, and structural anomalies without getting distracted by surface features.",
  },
  "f1-1.1.4": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional",
    standardPembelajaranMs:
      "1.1.4 Membuat keputusan bagi menentukan aspek penting dalam sesuatu permasalahan.",
    standardPembelajaranEn:
      "1.1.4 Make decisions by identifying the important aspects (abstraction) in a problem.",
    measuring:
      "Ability to retain all goal-critical constraints (budget, capacity, safety, formula inputs) while discarding decorative noise.",
  },
  "f1-1.1.5": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional",
    standardPembelajaranMs:
      "1.1.5 Menentukan ciri-ciri kesamaan dalam sesuatu permasalahan.",
    standardPembelajaranEn:
      "1.1.5 Determine common structural features across problems to form a general model or formula (pengitlakan).",
    measuring:
      "Ability to recognise shared mathematical structure across different real-world stories and verify a general formula across n = 1, 2, 3+.",
  },
  "f1-1.1": {
    standardKandungan: "1.1 Asas Pemikiran Komputasional (Mastery)",
    standardPembelajaranMs:
      "1.1.1 – 1.1.5 Penguasaan menyeluruh keempat-empat teknik pemikiran komputasional dalam masalah baharu.",
    standardPembelajaranEn:
      "1.1.1 – 1.1.5 Integrated mastery of all four computational thinking techniques on unseen multi-step problems.",
    measuring:
      "Interleaved discrimination — choosing and chaining leraian, pengecaman corak, peniskalaan, and pengitlakan without topic cues.",
  },

  "f1-2.1.1": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.1 Mengenal pasti nombor perduaan dan nombor perpuluhan.",
    standardPembelajaranEn:
      "2.1.1 Identify binary numbers (base-2) and decimal numbers (base-10) and their place values.",
    measuring:
      "Understanding base-2 digits (0, 1) and right-to-left powers-of-two place values (2⁰ = 1, 2¹ = 2, 2² = 4, 2³ = 8…).",
  },
  "f1-2.1.2": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.2 Menukar nombor perduaan kepada nombor perpuluhan.",
    standardPembelajaranEn:
      "2.1.2 Convert binary numbers into decimal numbers.",
    measuring:
      "Procedural fluency summing active 2ⁿ weights right-to-left up to 8 bits without reversing bit order or merely counting 1s.",
  },
  "f1-2.1.3": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.3 Menukar nombor perpuluhan kepada nombor perduaan.",
    standardPembelajaranEn:
      "2.1.3 Convert decimal numbers into binary numbers.",
    measuring:
      "Accurate decimal-to-binary conversion via place-value decomposition and division-by-2 (reading remainders bottom-to-top).",
  },
  "f1-2.1.4": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.4 Melakukan operasi tambah bagi dua nilai nombor perduaan.",
    standardPembelajaranEn:
      "2.1.4 Perform binary addition on two binary numbers.",
    measuring:
      "Mastery of the 5 binary addition rules, especially ripple carries (1₂ + 1₂ = 10₂) and triple-one columns (1₂ + 1₂ + 1₂ = 11₂).",
  },
  "f1-2.1.5": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.5 Melakukan operasi tolak bagi dua nilai nombor perduaan.",
    standardPembelajaranEn:
      "2.1.5 Perform binary subtraction on two binary numbers.",
    measuring:
      "Accurate binary borrowing (0 − 1 borrows 10₂ = 2 from the left) and multi-zero borrow propagation without flipping 0 − 1 into 1 − 0.",
  },
  "f1-2.1.6": {
    standardKandungan: "2.1 Sistem Nombor Perduaan",
    standardPembelajaranMs:
      "2.1.6 Menggabungkan kemahiran operasi tambah dan operasi tolak nombor perduaan dalam menterjemah aksara pengekodan ASCII.",
    standardPembelajaranEn:
      "2.1.6 Combine binary addition and subtraction skills to translate ASCII character codes.",
    measuring:
      "Distinguishing ASCII character codes ('5' = 00110101₂) from numeric binary (00000101₂) and applying ±00100000₂ (32) case shifts.",
  },
  "f1-2.1": {
    standardKandungan: "2.1 Sistem Nombor Perduaan (Mastery)",
    standardPembelajaranMs:
      "2.1.1 – 2.1.6 Penguasaan menyeluruh penukaran asas nombor, aritmetik perduaan dan pengekodan ASCII.",
    standardPembelajaranEn:
      "2.1.1 – 2.1.6 Integrated mastery of base conversion, binary arithmetic, and 8-bit ASCII translation.",
    measuring:
      "Sustained accuracy switching between conversion, carry/borrow arithmetic, error spotting, and ASCII decoding.",
  },

  "f1-2.2.1": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.1 Mengenal pasti unit ukuran bagi imej digital dan audio digital.",
    standardPembelajaranEn:
      "2.2.1 Identify measurement units for digital images (piksel, dpi, bit) and digital audio (Hz, bit, saluran).",
    measuring:
      "Correct pairing of image vs audio attributes with units and exponential palette calculation (2ⁿ colours for n-bit depth).",
  },
  "f1-2.2.2": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.2 Membanding saiz fail imej yang sama dalam pelbagai format melalui tunjuk cara: BMP, JPEG, TIFF dan GIF.",
    standardPembelajaranEn:
      "2.2.2 Compare file size and properties of the same image across BMP, JPEG, TIFF and GIF formats.",
    measuring:
      "Understanding lossy vs lossless vs uncompressed trade-offs, colour limits (GIF ≤ 256 colours), animation, and suitability by use case.",
  },
  "f1-2.2.3": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.3 Membandingkan kualiti dan saiz imej apabila kedalaman warna (colour depth) dan resolusi bagi imej dikurangkan.",
    standardPembelajaranEn:
      "2.2.3 Compare image quality and file size when colour depth and resolution change.",
    measuring:
      "Quantitative calculation of uncompressed pixel data (width × height × bytes/pixel) and quadratic scaling when dimensions double.",
  },
  "f1-2.2.4": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.4 Menghubung kait saiz audio dengan kadar kedalaman bit (bit depth) bagi audio.",
    standardPembelajaranEn:
      "2.2.4 Relate audio file size to audio bit rate (Sample rate × Bit depth × Channels) and duration.",
    measuring:
      "Applying Kadar bit = Kadar sampel × Kedalaman bit × Saluran (mono=1, stereo=2) and dividing bits by 8 to obtain bytes.",
  },
  "f1-2.2.5": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.5 Membandingkan saiz fail dan kualiti untuk audio yang sama bagi format berlainan: WAVE (.wav), MP3 (.mp3) dan MIDI (.mid).",
    standardPembelajaranEn:
      "2.2.5 Compare file size and quality of audio across WAV, MP3, and MIDI formats.",
    measuring:
      "Distinguishing uncompressed waveforms (WAV), lossy compressed audio (MP3), and instrument note instructions (MIDI — cannot record vocals).",
  },
  "f1-2.2.6": {
    standardKandungan: "2.2 Ukuran Data",
    standardPembelajaranMs:
      "2.2.6 Menghasilkan penukaran saiz data dari bit ke bait, kilobait, megabait, gigabait dan terabait bagi fail audio dan imej.",
    standardPembelajaranEn:
      "2.2.6 Convert data sizes across bit, byte (bait), KB, MB, GB and TB for audio and image files.",
    measuring:
      "Accurate unit ordering and multi-step conversion using 1 bait = 8 bit and binary prefix factor 1,024 (not 1,000).",
  },
  "f1-2.2": {
    standardKandungan: "2.2 Ukuran Data (Mastery)",
    standardPembelajaranMs:
      "2.2.1 – 2.2.6 Penguasaan menyeluruh atribut media digital, perbandingan format fail, dan pengiraan saiz storan.",
    standardPembelajaranEn:
      "2.2.1 – 2.2.6 Integrated mastery of digital media attributes, file formats, and storage size calculations.",
    measuring:
      "End-to-end media calculations from pixel/sample parameters through bits → bytes → KB/MB/GB alongside format selection.",
  },

  "f1-3.1.1": {
    standardKandungan: "3.1 Pembangunan Algoritma",
    standardPembelajaranMs:
      "3.1.1 Menulis pseudokod dan melukis carta alir pelbagai pilihan dalam penyelesaian masalah.",
    standardPembelajaranEn:
      "3.1.1 Write pseudocode and draw flowcharts involving single, dual, and multi-way selection control structures.",
    measuring:
      "Sequencing JIKA…MAKA / LAIN JIKA / LAIN / TAMAT JIKA from narrowest to widest threshold, boundary accuracy (> vs >=), and standard flowchart symbols.",
  },
  "f1-3.1.2": {
    standardKandungan: "3.1 Pembangunan Algoritma",
    standardPembelajaranMs:
      "3.1.2 Menulis pseudokod dan melukis carta alir yang melibatkan ulangan (UNTUK, SELAGI, ULANG–SEHINGGA).",
    standardPembelajaranEn:
      "3.1.2 Write pseudocode and draw flowcharts involving repetition structures (FOR, WHILE, REPEAT–UNTIL).",
    measuring:
      "Mental code tracing of counters and accumulators, and distinguishing pre-test SELAGI (0+ passes) from post-test ULANG–SEHINGGA (1+ passes, stops when True).",
  },
  "f1-3.1.3": {
    standardKandungan: "3.1 Pembangunan Algoritma",
    standardPembelajaranMs:
      "3.1.3 Mengesan ralat daripada pseudokod dan carta alir dalam penyelesaian masalah.",
    standardPembelajaranEn:
      "3.1.3 Detect errors in pseudocode and flowcharts using desk-checking (semakan meja) and step-by-step tracing.",
    measuring:
      "Pinpointing off-by-one loops, infinite loops, reset accumulators inside loops, shadowed branches, BODMAS bugs, and wrong flowchart shapes.",
  },
  "f1-3.1.4": {
    standardKandungan: "3.1 Pembangunan Algoritma",
    standardPembelajaranMs:
      "3.1.4 Menghasilkan pseudokod dan carta alir yang melibatkan gabungan pelbagai pilihan dan ulangan.",
    standardPembelajaranEn:
      "3.1.4 Produce pseudocode and flowcharts combining multi-way selection and repetition.",
    measuring:
      "Constructing and tracing nested selection-inside-loop (counting/filtering/max) and selection-after-loop (average → pass/fail) algorithms.",
  },
  "f1-3.1": {
    standardKandungan: "3.1 Pembangunan Algoritma (Mastery)",
    standardPembelajaranMs:
      "3.1.1 – 3.1.4 Penguasaan menyeluruh pembinaan, penjejakan dan penyahpepijatan algoritma.",
    standardPembelajaranEn:
      "3.1.1 – 3.1.4 Integrated mastery of constructing, tracing, and debugging pseudocode and flowcharts.",
    measuring:
      "Deep algorithmic reasoning across flowchart symbols, nested loops, sequential vs chained JIKA blocks, boundary test design, and bug fixing.",
  },

  "f1-4.1.1": {
    standardKandungan: "4.1 Kod Arahan",
    standardPembelajaranMs:
      "4.1.1 Menggunakan pemboleh ubah dan operator matematik dalam atur cara yang dibangunkan.",
    standardPembelajaranEn:
      "4.1.1 Use variables (numeric, text, Boolean) and computer math operators (+, -, *, /) in programs.",
    measuring:
      "Distinguishing variable data types, `*`/`/` operators vs `×`/`÷`, variable reporter value vs literal string, and `set` vs `change by` in Scratch.",
  },
  "f1-4.1.2": {
    standardKandungan: "4.1 Kod Arahan",
    standardPembelajaranMs:
      "4.1.2 Menghasilkan atur cara yang melibatkan penggunaan pelbagai pilihan.",
    standardPembelajaranEn:
      "4.1.2 Produce programs involving single, dual, and nested multi-way selection (`if-then`, `if-then-else`).",
    measuring:
      "Tracing nested Scratch `if-else` blocks, handling `>=` boundaries in Scratch (`>` / `or =`), and seeing why separate `if` blocks fall through.",
  },
  "f1-4.1.3": {
    standardKandungan: "4.1 Kod Arahan",
    standardPembelajaranMs:
      "4.1.3 Menghasilkan atur cara yang melibatkan penggunaan ulangan.",
    standardPembelajaranEn:
      "4.1.3 Produce programs involving repetition (`repeat`, `repeat until`, `forever`).",
    measuring:
      "Ordering Scratch loop scripts, polygon exterior turn angles (360° ÷ n), `repeat until` termination logic, and statement order inside loops.",
  },
  "f1-4.1.4": {
    standardKandungan: "4.1 Kod Arahan",
    standardPembelajaranMs:
      "4.1.4 Membangunkan atur cara yang melibatkan penggunaan pelbagai pilihan, ulangan, pemboleh ubah dan operator matematik.",
    standardPembelajaranEn:
      "4.1.4 Apply the 5 phases of program development (analysis, design, coding, testing & debugging, documentation) to build complete programs.",
    measuring:
      "Sequencing the 5 SDLC phases, mapping IPO / pseudocode / flowchart / GUI deliverables to the right phase, and assembling full Scratch scripts.",
  },
  "f1-4.1.5": {
    standardKandungan: "4.1 Kod Arahan",
    standardPembelajaranMs:
      "4.1.5 Menguji atur cara dan membaiki ralat pada kod arahan yang dihasilkan.",
    standardPembelajaranEn:
      "4.1.5 Test programs and debug syntax, runtime, and logic errors in instruction code.",
    measuring:
      "Classifying ralat sintaks vs ralat masa larian (e.g. ÷ 0) vs ralat logik, designing boundary test cases, and locating faulty Scratch blocks.",
  },
  "f1-4.1": {
    standardKandungan: "4.1 Kod Arahan (Mastery)",
    standardPembelajaranMs:
      "4.1.1 – 4.1.5 Penguasaan menyeluruh pembangunan dan penyahpepijatan atur cara Scratch.",
    standardPembelajaranEn:
      "4.1.1 – 4.1.5 Integrated mastery of Scratch programming constructs, development phases, and debugging.",
    measuring:
      "Transfer across variables, operators, selection, loops, SDLC deliverables, and error classification.",
  },

  "f1-4.2.1": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.1 Melakar papan cerita untuk membina laman sesawang yang menggunakan kod arahan HTML.",
    standardPembelajaranEn:
      "4.2.1 Sketch a storyboard (papan cerita) to plan a website built with HTML.",
    measuring:
      "Understanding storyboards as pre-coding visual & navigation blueprints, homepage hierarchy, dead-end link detection, and `.html` file basics.",
  },
  "f1-4.2.2": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.2 Menggunakan tag dalam atur cara HTML: <html>, <head>, <title>, <body> dan <p>.",
    standardPembelajaranEn:
      "4.2.2 Use foundational container tags in HTML: <html>, <head>, <title>, <body> and <p>.",
    measuring:
      "Distinguishing browser-tab `<title>` inside `<head>` from visible page content inside `<body>`, proper nesting order, and closing `/` slashes.",
  },
  "f1-4.2.3": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.3 Menggunakan paragraph headings (<h1> hingga <h6>) dalam atur cara HTML yang dibina.",
    standardPembelajaranEn:
      "4.2.3 Use paragraph headings (<h1> through <h6>) to structure HTML pages.",
    measuring:
      "Knowing `<h1>` is largest down to `<h6>` smallest (no `<h7>`), structural hierarchy, and visual effect of unclosed heading tags.",
  },
  "f1-4.2.4": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.4 Menggunakan atur cara HTML untuk menghasilkan Banner, Frame dan Menu.",
    standardPembelajaranEn:
      "4.2.4 Write HTML code to produce Banners, Frames (`<frameset rows/cols>`), and Navigation Menus (`<nav><ul><li>`).",
    measuring:
      "Distinguishing horizontal `rows` vs vertical `cols` in `<frameset>`, `<nav><ul><li>` menu nesting, and static/drop-down/multilevel/floating menus.",
  },
  "f1-4.2.5": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.5 Membina pautan teks dan imej dalam atur cara HTML.",
    standardPembelajaranEn:
      "4.2.5 Build text hyperlinks and clickable image hyperlinks (`<a href=...><img src=...></a>`) in HTML.",
    measuring:
      "Distinguishing `href` (destination) from visible anchor content, wrapping `<img>` inside `<a>`, `target` frame navigation, and protocol prefixes.",
  },
  "f1-4.2.6": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.6 Menulis atur cara untuk memasukkan imej dalam atur cara HTML.",
    standardPembelajaranEn:
      "4.2.6 Write HTML code to insert images (`<img src=... alt=... width=... height=...>`) into web pages.",
    measuring:
      "Accurate `<img src>` syntax (avoiding `scr`/`href`), `alt` fallback purpose, void-tag behaviour, relative folder paths vs URLs, and aspect ratio.",
  },
  "f1-4.2.7": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.7 Menghasilkan pull-down menu melalui atur cara HTML.",
    standardPembelajaranEn:
      "4.2.7 Create pull-down selection menus using `<select>` and `<option>` tags in HTML.",
    measuring:
      "Strict parent-child nesting (`<select>` wrapping `<option value=...>`), default/selected display behaviour, and form integration.",
  },
  "f1-4.2.8": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.8 Menghasilkan ruang komen melalui atur cara HTML.",
    standardPembelajaranEn:
      "4.2.8 Create a visitor comment/feedback space (`<form>`, `<textarea>`, `<input type='submit'>`) in HTML.",
    measuring:
      "Building interactive `<form><textarea rows cols></textarea><input type='submit'></form>` and distinguishing visible `Ruang komen` from hidden `<!-- -->` notes.",
  },
  "f1-4.2.9": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.9 Mengesan sebarang ralat yang berlaku dalam atur cara HTML yang dibina.",
    standardPembelajaranEn:
      "4.2.9 Detect and fix syntax, attribute, nesting, and comment (`<!-- ... -->`) errors in HTML code.",
    measuring:
      "Spotting `scr` typos, missing `/` on closing tags, unclosed `<!--` comments swallowing markup, misplaced tags in `<head>`, and iterative browser debugging.",
  },
  "f1-4.2.10": {
    standardKandungan: "4.2 Kod Arahan HTML",
    standardPembelajaranMs:
      "4.2.10 Membina laman sesawang yang interaktif.",
    standardPembelajaranEn:
      "4.2.10 Build an interactive website integrating navigation, media, forms, domain/IP concepts, and homepage structure.",
    measuring:
      "Distinguishing interactive controls from static markup, relating domain names, IP addresses, and homepages, and organising a complete multi-page site.",
  },
  "f1-4.2": {
    standardKandungan: "4.2 Kod Arahan HTML (Mastery)",
    standardPembelajaranMs:
      "4.2.1 – 4.2.10 Penguasaan menyeluruh reka bentuk papan cerita, penulisan kod HTML interaktif, dan pengesanan ralat.",
    standardPembelajaranEn:
      "4.2.1 – 4.2.10 Integrated mastery of storyboarding, interactive HTML authoring, and HTML debugging.",
    measuring:
      "Synthesising tags, attributes, frames, links, images, pull-down menus, comment forms, and error diagnosis without isolated subtopic hints.",
  },
};

export const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  recall: "Recall — Retrieve exact terminology, symbol, or rule from memory",
  understand: "Understand — Classify concepts, compare formats, or explain why a rule holds",
  apply: "Apply — Execute a calculation, conversion, or structural construction",
  trace: "Trace — Mentally step through code/markup and predict exact output",
  debug: "Debug — Locate, classify, and correct a syntax, runtime, or logic defect",
  analyse: "Analyse — Decompose a novel scenario, spot boundary cases, or evaluate design trade-offs",
};

export function standardForCheckpoint(cp: Checkpoint): LearningStandard {
  return (
    FORM1_STANDARDS[cp.id] ?? {
      standardKandungan: `${cp.code} ${cp.titleMs}`,
      standardPembelajaranMs: `${cp.code} ${cp.titleMs}`,
      standardPembelajaranEn: `${cp.code} ${cp.title}`,
      measuring: cp.objective,
    }
  );
}

/** Human-readable answer key for any item kind (for Teacher's Guide & Question Bank Studio). */
export function formatItemAnswerKey(item: Item): string {
  switch (item.kind) {
    case "mcq": {
      const idx = item.options.findIndex((o) => o.id === item.answer);
      const letter = idx >= 0 ? String.fromCharCode(65 + idx) : "?";
      const opt = item.options.find((o) => o.id === item.answer);
      return `Option ${letter}: ${opt?.text ?? item.answer}`;
    }
    case "multi": {
      const set = new Set(item.answer);
      return item.options
        .map((o, i) => (set.has(o.id) ? `${String.fromCharCode(65 + i)}) ${o.text}` : null))
        .filter(Boolean)
        .join("  •  ");
    }
    case "order":
      return item.steps.map((s, i) => `${i + 1}. ${s.text}`).join(" → ");
    case "match":
      return item.pairs.map((p) => `${p.left}  =  ${p.right}`).join("  |  ");
    case "sort":
      return item.buckets
        .map(
          (b) =>
            `[${b.label}]: ${item.cards
              .filter((c) => c.bucket === b.id)
              .map((c) => c.text)
              .join("; ")}`,
        )
        .join("   ");
    case "input":
      return `Accepted: ${item.accept.join("  or  ")}`;
    case "bug":
      return `Line ${item.answer + 1}: ${item.lines[item.answer]}`;
    case "binary": {
      const bin = item.target.toString(2).padStart(item.bits, "0");
      return `${bin}₂  (= ${item.target}₁₀ across ${item.bits} bits)`;
    }
  }
}

/** Extract every diagnostic misconception probe embedded in an item's distractors/traps. */
export function extractItemTraps(
  item: Item,
  misconceptions: Record<string, string>,
): Array<{ trigger: string; tag: string; meaning: string }> {
  const out: Array<{ trigger: string; tag: string; meaning: string }> = [];
  const push = (trigger: string, tag?: string) => {
    if (!tag) return;
    out.push({
      trigger,
      tag,
      meaning: misconceptions[tag] ?? tag,
    });
  };
  switch (item.kind) {
    case "mcq":
    case "multi":
      item.options.forEach((o, i) =>
        push(`Option ${String.fromCharCode(65 + i)} ("${o.text}")`, o.misconception),
      );
      break;
    case "order":
      push("Wrong step sequence", item.misconception);
      break;
    case "sort":
      for (const c of item.cards) {
        if (c.misconception) {
          push(`Misplacing "${c.text}"`, c.misconception);
        }
      }
      break;
    case "input":
      for (const t of item.traps ?? []) {
        push(`Typing "${t.answer}"`, t.misconception);
      }
      break;
    case "bug":
      for (const [ln, tag] of Object.entries(item.lineTraps ?? {})) {
        push(`Picking Line ${Number(ln) + 1}`, tag);
      }
      break;
    default:
      break;
  }
  return out;
}
