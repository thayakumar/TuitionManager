#!/usr/bin/env node
/**
 * Generate clean, scroll- & discussion-ready Chapter Teacher's Guide PDFs for
 * Form 1 Asas Sains Komputer (`public/teacher-guides/Form1-Bab{1..4}-Teachers-Guide.pdf`).
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const cache = new Map();

function load(file) {
  const filename = path.isAbsolute(file) ? file : path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(root);
  cache.set(filename, m);
  const original = m.require.bind(m);
  m.require = (name) => {
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/")
        ? path.resolve(root, name.slice(2))
        : path.resolve(path.dirname(filename), name);
      for (const candidate of [base + ".ts", path.join(base, "index.ts")]) {
        if (fs.existsSync(candidate)) return load(candidate);
      }
    }
    return original(name);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}

const { form1 } = load("lib/review/content/form1/index.ts");
const { GAMES, PASS_PERCENT } = load("lib/review/games.ts");
const {
  standardForCheckpoint,
  SKILL_DESCRIPTIONS,
  formatItemAnswerKey,
  extractItemTraps,
} = load("lib/review/standards.ts");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtInline(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

function renderItemStructureHtml(item) {
  switch (item.kind) {
    case "mcq":
    case "multi": {
      const ansSet = new Set(item.kind === "mcq" ? [item.answer] : item.answer);
      return `<div class="options-grid">${item.options
        .map((o, idx) => {
          const ok = ansSet.has(o.id);
          return `<div class="opt ${ok ? "opt-ok" : ""}"><strong>${String.fromCharCode(
            65 + idx,
          )}.</strong> ${esc(o.text)}${ok ? ' <span class="ok-tag">✓ Answer</span>' : ""}</div>`;
        })
        .join("")}</div>`;
    }
    case "order":
      return `<div class="sub-box"><div class="sub-label">Correct Sequence (shuffled for students):</div><ol class="mono-list">${item.steps
        .map((s) => `<li>${esc(s.text)}</li>`)
        .join("")}</ol></div>`;
    case "match":
      return `<div class="sub-box"><div class="sub-label">Matched Pairs:</div><ul class="pair-list">${item.pairs
        .map((p) => `<li><strong>${esc(p.left)}</strong> &nbsp;↔&nbsp; ${esc(p.right)}</li>`)
        .join("")}</ul></div>`;
    case "sort":
      return `<div class="options-grid">${item.buckets
        .map(
          (b) =>
            `<div class="sub-box"><div class="sub-label">${esc(b.label)}</div><ul class="pair-list">${item.cards
              .filter((c) => c.bucket === b.id)
              .map((c) => `<li>${esc(c.text)}</li>`)
              .join("")}</ul></div>`,
        )
        .join("")}</div>`;
    case "bug":
      return `<div class="code-block">${item.lines
        .map(
          (ln, i) =>
            `<div class="${i === item.answer ? "bug-line" : ""}">${String(i + 1).padStart(
              2,
              " ",
            )}. ${esc(ln)}${i === item.answer ? "   ← [BUGGY LINE]" : ""}</div>`,
        )
        .join("")}</div>`;
    case "binary":
      return `<div class="sub-box mono">Bit Flipper Register: ${item.bits} bits • Target: ${
        item.target
      }₁₀ = <strong>${item.target.toString(2).padStart(item.bits, "0")}₂</strong></div>`;
    default:
      return "";
  }
}

function buildChapterHtml(chapter) {
  const totalQ = chapter.checkpoints.reduce((s, c) => s + c.items.length, 0);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Form 1 ASK — Bab ${chapter.number} Teacher's Guide</title>
<style>
  @page { size: A4; margin: 14mm 13mm 16mm 13mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #231c18;
    font-size: 10.5pt;
    line-height: 1.45;
    background: #ffffff;
  }
  .cover {
    background: linear-gradient(120deg, #b82f25 0%, #d94625 65%, #e56a2c 100%);
    color: #ffffff;
    padding: 22px 26px;
    border-radius: 12px;
    border-bottom: 5px solid #ffab58;
    margin-bottom: 16px;
  }
  .eyebrow {
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #ffe2bd;
  }
  .cover h1 {
    margin: 6px 0 4px;
    font-size: 20pt;
    line-height: 1.2;
  }
  .cover .sub {
    font-size: 11pt;
    color: #fff3d9;
    margin: 0 0 12px;
  }
  .pills { display: flex; flex-wrap: wrap; gap: 8px; font-size: 8.5pt; font-weight: 700; }
  .pill { background: rgba(0, 0, 0, 0.22); padding: 4px 10px; border-radius: 999px; }
  h2.sec-title {
    font-size: 12.5pt;
    color: #9a2c1d;
    border-bottom: 2px solid #f2dcd0;
    padding-bottom: 4px;
    margin: 18px 0 10px;
    break-after: avoid;
    page-break-after: avoid;
  }
  .inline-code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 9pt;
    background: #f5ebe4;
    color: #7c2d12;
    padding: 1px 4px;
    border-radius: 3px;
  }
  table.summary {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin-bottom: 14px;
  }
  table.summary th, table.summary td {
    border: 1px solid #e6d5ca;
    padding: 6px 8px;
    vertical-align: top;
    text-align: left;
  }
  table.summary th { background: #fff3ea; color: #7a2819; font-weight: 700; }
  .misc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }
  .misc-card {
    border: 1px solid #ead8cd;
    background: #fffaf6;
    border-radius: 7px;
    padding: 7px 9px;
    font-size: 8.8pt;
    break-inside: avoid;
  }
  .misc-tag { font-family: monospace; font-weight: 700; color: #b82f25; }
  .cp-header {
    background: #fff3ea;
    border: 1.5px solid #e2b89e;
    border-radius: 10px;
    padding: 12px 14px;
    margin: 20px 0 12px;
    break-inside: avoid;
    break-after: avoid;
    page-break-after: avoid;
  }
  .cp-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    font-weight: 700;
    color: #9a2c1d;
  }
  .cp-header h3 { margin: 4px 0 2px; font-size: 13.5pt; color: #231c18; }
  .cp-ms { font-size: 9.5pt; color: #68564e; margin-bottom: 8px; }
  .std-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8.8pt; }
  .std-box { background: #ffffff; border: 1px solid #ebd7c9; border-radius: 6px; padding: 7px 9px; }
  .std-box strong { color: #9a2c1d; display: block; margin-bottom: 2px; }
  .q-card {
    border: 1px solid #dfd2c9;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    background: #ffffff;
    break-inside: avoid;
  }
  .q-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f0e6df;
    padding-bottom: 5px;
    margin-bottom: 7px;
    font-size: 8.5pt;
  }
  .q-badge {
    background: #b82f25;
    color: #fff;
    font-family: monospace;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    margin-right: 6px;
  }
  .q-kind {
    background: #fff0e5;
    color: #9a2c1d;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
  }
  .q-skill { font-weight: 700; color: #443630; }
  .q-prompt { font-weight: 600; font-size: 10pt; white-space: pre-line; margin: 6px 0; }
  .code-block {
    background: #1e1916;
    color: #fde68a;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 8.6pt;
    padding: 8px 10px;
    border-radius: 6px;
    white-space: pre-wrap;
    margin: 6px 0;
  }
  .bug-line {
    background: #7f1d1d;
    color: #fffbeb;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 7px 0;
    font-size: 9pt;
  }
  .opt {
    border: 1px solid #e2d6ce;
    border-radius: 5px;
    padding: 5px 8px;
    background: #fcfaf8;
  }
  .opt-ok {
    border-color: #16a34a;
    background: #ecfdf5;
    color: #064e3b;
    font-weight: 600;
  }
  .ok-tag { font-size: 8pt; font-weight: 700; color: #15803d; }
  .sub-box {
    border: 1px solid #e5d8cf;
    background: #faf6f2;
    border-radius: 5px;
    padding: 6px 9px;
    font-size: 8.8pt;
    margin: 6px 0;
  }
  .sub-label { font-weight: 700; color: #5c4b43; margin-bottom: 3px; }
  .mono, .mono-list { font-family: "SFMono-Regular", Consolas, monospace; margin: 2px 0; padding-left: 18px; }
  .pair-list { margin: 2px 0; padding-left: 16px; }
  .key-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 7px 10px;
    margin-top: 7px;
    font-size: 9pt;
  }
  .key-line { color: #064e3b; margin-bottom: 3px; }
  .exp-line { color: #292524; }
  .trap-box {
    margin-top: 5px;
    padding-top: 4px;
    border-top: 1px dashed #bbf7d0;
    color: #7c2d12;
    font-size: 8.5pt;
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="eyebrow">TuitionHub Teacher's Review &amp; Discussion Guide • Form 1 Asas Sains Komputer (KSSM)</div>
    <h1>Bab ${chapter.number}: ${esc(chapter.titleMs)}</h1>
    <p class="sub">${esc(chapter.title)} — ${esc(chapter.blurb)}</p>
    <div class="pills">
      <span class="pill">${chapter.checkpoints.length} Checkpoints (Sub-chapters + Mastery Boss)</span>
      <span class="pill">${totalQ} Questions &amp; Answer Keys</span>
      <span class="pill">Pass Gate: ${PASS_PERCENT}% • 5–8 min / checkpoint</span>
    </div>
  </div>

  <h2 class="sec-title">1. KSSM Standard Pembelajaran &amp; Game Mapping</h2>
  <table class="summary">
    <thead>
      <tr>
        <th style="width:10%">Code</th>
        <th style="width:22%">Checkpoint</th>
        <th style="width:16%">Game Mode</th>
        <th style="width:10%">Pool / Draw</th>
        <th>KSSM Standard Pembelajaran (DSKP)</th>
      </tr>
    </thead>
    <tbody>
      ${chapter.checkpoints
        .map((cp) => {
          const std = standardForCheckpoint(cp);
          const g = GAMES[cp.game];
          return `<tr>
            <td><strong>${cp.boss ? `BOSS ${esc(cp.code)}` : esc(cp.code)}</strong></td>
            <td><strong>${esc(cp.title)}</strong><br/><span style="color:#6b5b53">${esc(cp.titleMs)}</span></td>
            <td>${esc(g.name)}</td>
            <td>${cp.items.length} / ${cp.draw}</td>
            <td>${esc(std.standardPembelajaranMs)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>

  <h2 class="sec-title">2. Diagnostic Misconception Catalogue (What Wrong Answers Reveal)</h2>
  <div class="misc-grid">
    ${Object.entries(chapter.misconceptions)
      .map(
        ([tag, desc]) =>
          `<div class="misc-card"><div class="misc-tag">${esc(tag)}</div><div>${fmtInline(desc)}</div></div>`,
      )
      .join("")}
  </div>

  <h2 class="sec-title">3. Complete Checkpoint Questions, Answer Keys &amp; Discussion Notes</h2>
  ${chapter.checkpoints
    .map((cp) => {
      const std = standardForCheckpoint(cp);
      const g = GAMES[cp.game];
      return `
      <div class="cp-header">
        <div class="cp-top">
          <span>${cp.boss ? `MASTERY BOSS ${esc(cp.code)}` : `SUB-CHAPTER CHECKPOINT ${esc(cp.code)}`}</span>
          <span>Game: ${esc(g.name)} • ${cp.items.length} Questions (draws ${cp.draw}/attempt)</span>
        </div>
        <h3>${esc(cp.code)} — ${esc(cp.title)}</h3>
        <div class="cp-ms">${esc(cp.titleMs)}</div>
        <div class="std-grid">
          <div class="std-box">
            <strong>KSSM Standard Pembelajaran</strong>
            <div>${esc(std.standardPembelajaranMs)}</div>
            <div style="color:#68564e;margin-top:3px">${esc(std.standardPembelajaranEn)}</div>
          </div>
          <div class="std-box">
            <strong>What Student Must Achieve &amp; Game Choice</strong>
            <div>${esc(std.measuring)}</div>
            <div style="color:#68564e;margin-top:3px"><em>Why ${esc(g.name)}:</em> ${esc(g.evidence)}</div>
          </div>
        </div>
      </div>
      ${cp.items
        .map((item, idx) => {
          const key = formatItemAnswerKey(item);
          const traps = extractItemTraps(item, chapter.misconceptions);
          return `<div class="q-card">
            <div class="q-meta">
              <div>
                <span class="q-badge">Q${idx + 1}</span>
                <span style="font-family:monospace;color:#68564e">${esc(item.id)}</span>
                <span class="q-kind">${esc(item.kind)}</span>
              </div>
              <div class="q-skill">${esc(SKILL_DESCRIPTIONS[item.skill])}</div>
            </div>
            <div class="q-prompt">${fmtInline(item.prompt)}</div>
            ${item.code ? `<div class="code-block">${esc(item.code)}</div>` : ""}
            ${renderItemStructureHtml(item)}
            <div class="key-box">
              <div class="key-line"><strong>Answer Key:</strong> <span style="font-family:monospace">${esc(key)}</span></div>
              <div class="exp-line"><strong>Discussion &amp; Explanation:</strong> ${fmtInline(item.explanation)}</div>
              ${
                traps.length
                  ? `<div class="trap-box"><strong>Diagnostic Misconception Probes:</strong> ${traps
                      .map((t) => `${fmtInline(t.trigger)} [${esc(t.tag)}]: ${fmtInline(t.meaning)}`)
                      .join(" • ")}</div>`
                  : ""
              }
            </div>
          </div>`;
        })
        .join("")}`;
    })
    .join("")}
</body>
</html>`;
}

const outDir = path.resolve(root, "public", "teacher-guides");
fs.mkdirSync(outDir, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "teacher-guides-"));

try {
  for (const ch of form1.chapters) {
    const htmlPath = path.join(tmpDir, `bab${ch.number}.html`);
    const pdfPath = path.join(outDir, `Form1-Bab${ch.number}-Teachers-Guide.pdf`);
    fs.writeFileSync(htmlPath, buildChapterHtml(ch), "utf8");
    execFileSync(
      "/usr/bin/google-chrome",
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`,
      ],
      { stdio: "pipe" },
    );
    const sizeKb = Math.round(fs.statSync(pdfPath).size / 1024);
    console.log(`Generated ${path.relative(root, pdfPath)} (${sizeKb} KB)`);
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
