const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-review-quest-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  let role = "admin";
  let studentId = null;
  const cache = new Map();
  const auth = {
    verifyAdminSession: async () => role === "admin",
    getStudentSession: async () => (role === "student" ? studentId : null),
    createAdminSession: async () => "tok",
    destroyAdminSession: async () => {},
    createStudentSession: async () => {},
    destroyStudentSession: async () => {},
  };

  function resolveTs(base) {
    for (const candidate of [base + ".ts", path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function load(relative) {
    const filename = path.isAbsolute(relative)
      ? relative
      : path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(root);
    cache.set(filename, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (name === "server-only") return {};
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/navigation") {
        return {
          redirect(url) {
            throw new Error(`REDIRECT:${url}`);
          },
          notFound() {
            throw new Error("NOT_FOUND");
          },
        };
      }
      if (name === "./auth" || name === "../auth" || name === "@/lib/auth") {
        return auth;
      }
      if (name.startsWith("@/")) {
        const hit = resolveTs(path.resolve(root, name.slice(2)));
        if (hit) return load(hit);
      }
      if (name.startsWith(".")) {
        const hit = resolveTs(path.resolve(path.dirname(filename), name));
        if (hit) return load(hit);
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

  const db = load("lib/db.ts");
  const service = load("lib/review/service.ts");
  const bank = load("lib/review/bank.ts");
  const curriculumMod = load("lib/review/curriculum.ts");
  const validator = load("lib/review/validate.ts");
  const form1 = load("lib/review/content/form1/index.ts").form1;

  return {
    db,
    service,
    bank,
    curriculumMod,
    validator,
    form1,
    as(nextRole, nextStudentId = null) {
      role = nextRole;
      studentId = nextStudentId;
    },
    async seed() {
      await db.migrate();
      await db.execute(
        "INSERT INTO students(id, name, subject, grade_level, hourly_rate, active) VALUES (1, 'Aiman', 'Asas Sains Komputer', 'Form 1', 50, 1)",
      );
      await db.execute(
        "INSERT INTO students(id, name, subject, grade_level, hourly_rate, active) VALUES (2, 'Mei Ling', 'Asas Sains Komputer', 'Tingkatan 3', 50, 1)",
      );
    },
    close() {
      try {
        db.getClient().close();
      } catch {}
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function correctResponseFor(rawItem) {
  switch (rawItem.kind) {
    case "mcq":
      return { kind: "mcq", choice: rawItem.answer };
    case "multi":
      return { kind: "multi", choices: [...rawItem.answer] };
    case "order":
      return { kind: "order", order: rawItem.steps.map((s) => s.id) };
    case "match": {
      const pairs = {};
      for (const p of rawItem.pairs) pairs[p.id] = p.id;
      return { kind: "match", pairs };
    }
    case "sort": {
      const placement = {};
      for (const c of rawItem.cards) placement[c.id] = c.bucket;
      return { kind: "sort", placement };
    }
    case "input":
      return { kind: "input", value: rawItem.accept[0] };
    case "bug":
      return { kind: "bug", line: rawItem.answer };
    case "binary":
      return {
        kind: "binary",
        value: rawItem.target.toString(2).padStart(rawItem.bits, "0"),
      };
  }
}

function wrongResponseFor(rawItem) {
  switch (rawItem.kind) {
    case "mcq": {
      const wrong =
        rawItem.options.find((o) => o.id !== rawItem.answer && o.misconception) ||
        rawItem.options.find((o) => o.id !== rawItem.answer);
      return { kind: "mcq", choice: wrong.id };
    }
    case "multi": {
      const wrong = rawItem.options.find((o) => !rawItem.answer.includes(o.id));
      return { kind: "multi", choices: [wrong.id] };
    }
    case "order":
      return {
        kind: "order",
        order: [...rawItem.steps.map((s) => s.id)].reverse(),
      };
    case "match": {
      const ids = rawItem.pairs.map((p) => p.id);
      const pairs = {};
      ids.forEach((id, idx) => {
        pairs[id] = ids[(idx + 1) % ids.length];
      });
      return { kind: "match", pairs };
    }
    case "sort": {
      const placement = {};
      for (const c of rawItem.cards) {
        const other = rawItem.buckets.find((b) => b.id !== c.bucket);
        placement[c.id] = other.id;
      }
      return { kind: "sort", placement };
    }
    case "input":
      return {
        kind: "input",
        value: rawItem.traps?.[0]?.answer ?? "__definitely_wrong__",
      };
    case "bug":
      return { kind: "bug", line: (rawItem.answer + 1) % rawItem.lines.length };
    case "binary": {
      const right = rawItem.target.toString(2).padStart(rawItem.bits, "0");
      const flipped = (right[0] === "1" ? "0" : "1") + right.slice(1);
      return { kind: "binary", value: flipped };
    }
  }
}

test("Form 1 ASK question bank validates all 42 checkpoints within 5–8 minutes with zero duplicate IDs", () => {
  const f = fixture();
  try {
    const seen = new Set();
    let totalCheckpoints = 0;
    for (const ch of f.form1.chapters) {
      totalCheckpoints += ch.checkpoints.length;
      const errors = f.validator.validateCheckpoints(
        ch.checkpoints,
        ch.misconceptions,
        seen,
      );
      assert.deepEqual(errors, [], `Chapter ${ch.id} had validation errors`);
    }
    assert.equal(f.form1.chapters.length, 4);
    assert.equal(totalCheckpoints, 42);
    assert.equal(f.curriculumMod.parseForm("Form 1"), 1);
    assert.equal(f.curriculumMod.parseForm("Tingkatan 3"), 3);
    assert.equal(f.curriculumMod.parseForm("F5"), 5);
    assert.equal(f.curriculumMod.parseForm("Year 9"), null);
  } finally {
    f.close();
  }
});

test("sequential 80% gate locks checkpoints until cleared, strips answers from client items, and isolates students & Forms", async () => {
  const f = fixture();
  try {
    await f.seed();

    // Student 1 cannot view Student 2's map
    f.as("student", 1);
    await assert.rejects(() => f.service.getStudentReviewMap(2), /own Review Quest/);

    // Student 2 is Form 3 ("Tingkatan 3") -> scoped to Form 3, cannot start Form 1 checkpoints
    f.as("student", 2);
    const map2 = await f.service.getStudentReviewMap(2);
    assert.equal(map2.student.form, 3);
    assert.equal(map2.status, "coming_soon");
    await assert.rejects(
      () => f.service.startOrResumeCheckpoint(2, "f1-1.1.1"),
      /coming soon/,
    );

    // Student 1 (Form 1) sees Station 1 open, checkpoint 1.1.1 unlocked, 1.1.2 locked
    f.as("student", 1);
    const map1 = await f.service.getStudentReviewMap(1);
    assert.equal(map1.status, "ready");
    const ch1 = map1.curriculum.chapters[0];
    assert.equal(ch1.checkpoints[0].checkpointId, "f1-1.1.1");
    assert.equal(ch1.checkpoints[0].unlocked, true);
    assert.equal(ch1.checkpoints[1].checkpointId, "f1-1.1.2");
    assert.equal(ch1.checkpoints[1].unlocked, false);

    // Locked checkpoint rejects start
    await assert.rejects(
      () => f.service.startOrResumeCheckpoint(1, "f1-1.1.2"),
      /locked/i,
    );

    // Start 1.1.1 and verify client items contain NO answer keys or explanations
    const session1 = await f.service.startOrResumeCheckpoint(1, "f1-1.1.1");
    assert.equal(session1.items.length, 7);
    for (const ci of session1.items) {
      assert.equal("answer" in ci, false);
      assert.equal("explanation" in ci, false);
      assert.equal("accept" in ci, false);
    }

    const rawCp1 = f.form1.chapters[0].checkpoints[0];
    const pool = new Map(rawCp1.items.map((i) => [i.id, i]));

    // Attempt #1: purposely fail (get only 2/7 right < 80%) with 1 high-confidence wrong blind spot
    let lastRes = null;
    for (let idx = 0; idx < session1.items.length; idx++) {
      const ci = session1.items[idx];
      const raw = pool.get(ci.id);
      const resp = idx < 2 ? correctResponseFor(raw) : wrongResponseFor(raw);
      lastRes = await f.service.submitCheckpointAnswer({
        studentId: 1,
        attemptId: session1.attemptId,
        itemId: ci.id,
        response: resp,
        confidence: idx === 2 ? "sure" : "unsure",
        timeMs: 18_000,
      });
    }
    assert.equal(lastRes.completed, true);
    assert.equal(lastRes.summary.passed, false);
    assert(lastRes.summary.scorePct < 80);

    // 1.1.2 MUST STILL BE LOCKED after failing attempt!
    await assert.rejects(
      () => f.service.startOrResumeCheckpoint(1, "f1-1.1.2"),
      /locked/i,
    );

    // Attempt #2: retry 1.1.1 and score 100% (>= 80%)!
    const session2 = await f.service.startOrResumeCheckpoint(1, "f1-1.1.1");
    assert.equal(session2.attemptNumber, 2);
    for (const ci of session2.items) {
      const raw = pool.get(ci.id);
      lastRes = await f.service.submitCheckpointAnswer({
        studentId: 1,
        attemptId: session2.attemptId,
        itemId: ci.id,
        response: correctResponseFor(raw),
        confidence: "sure",
        timeMs: 9_000,
      });
    }
    assert.equal(lastRes.completed, true);
    assert.equal(lastRes.summary.passed, true);
    assert.equal(lastRes.summary.scorePct, 100);
    assert.equal(lastRes.summary.stars, 3);
    assert.equal(lastRes.summary.nextCheckpoint.checkpointId, "f1-1.1.2");

    // 1.1.2 is NOW UNLOCKED!
    const unlockedSession = await f.service.startOrResumeCheckpoint(1, "f1-1.1.2");
    assert.equal(unlockedSession.checkpoint.id, "f1-1.1.2");
  } finally {
    f.close();
  }
});

test("teacher learner-intelligence report captures retries-to-correct, blind spots, gain, tutor unlock, and preserves history across Form promotion", async () => {
  const f = fixture();
  try {
    await f.seed();

    // Play 2.1.2 (Binary to Decimal) via tutor unlock so we also test misconception tags!
    f.as("admin");
    await f.service.setTutorCheckpointUnlock({
      studentId: 1,
      formLevel: 1,
      checkpointId: "f1-2.1.2",
      unlocked: true,
    });

    f.as("student", 1);
    const s1 = await f.service.startOrResumeCheckpoint(1, "f1-2.1.2");
    const rawCp = f.form1.chapters[1].checkpoints.find((c) => c.id === "f1-2.1.2");
    const pool = new Map(rawCp.items.map((i) => [i.id, i]));

    // Answer every question wrong (using misconception traps where available) with "sure" on first item
    for (let i = 0; i < s1.items.length; i++) {
      const ci = s1.items[i];
      const raw = pool.get(ci.id);
      await f.service.submitCheckpointAnswer({
        studentId: 1,
        attemptId: s1.attemptId,
        itemId: ci.id,
        response: wrongResponseFor(raw),
        confidence: i === 0 ? "sure" : "unsure",
        timeMs: 22_000,
      });
    }

    // Retry and answer every question right!
    const s2 = await f.service.startOrResumeCheckpoint(1, "f1-2.1.2");
    for (const ci of s2.items) {
      const raw = pool.get(ci.id);
      await f.service.submitCheckpointAnswer({
        studentId: 1,
        attemptId: s2.attemptId,
        itemId: ci.id,
        response: correctResponseFor(raw),
        confidence: "sure",
        timeMs: 10_000,
      });
    }

    // Admin inspects learner report
    f.as("admin");
    const report = await f.service.getTeacherStudentReviewReport(1);
    assert.equal(report.viewingForm, 1);
    assert.equal(report.overview.passedCheckpoints, 1);
    assert.equal(report.overview.completedAttempts, 2);
    assert.equal(report.overview.avgNormalisedGainPct, 100);
    assert(report.overview.calibration.sureWrong >= 1);
    assert(report.misconceptions.length >= 1);

    const retriedItems = report.items.filter(
      (it) => it.attemptsToFirstCorrect !== null && it.attemptsToFirstCorrect > 1,
    );
    assert(
      retriedItems.length >= 1,
      "Expected at least one item showing multiple attempts needed to get right",
    );

    // Promote student to Form 2 next year -> Form 1 history stays preserved and inspectable!
    await f.service.setStudentReviewForm({ studentId: 1, formLevel: 2 });
    f.as("student", 1);
    const promotedMap = await f.service.getStudentReviewMap(1);
    assert.equal(promotedMap.student.form, 2);
    assert.equal(promotedMap.status, "coming_soon");

    f.as("admin");
    const archivedForm1 = await f.service.getTeacherStudentReviewReport(1, 1);
    assert.deepEqual(archivedForm1.historicalForms, [1, 2]);
    assert.equal(archivedForm1.overview.passedCheckpoints, 1);
    assert.equal(archivedForm1.overview.completedAttempts, 2);
  } finally {
    f.close();
  }
});

test("teacher question bank supports adding, editing, deleting, and restoring questions with live overlay", async () => {
  const f = fixture();
  try {
    await f.seed();

    // Students cannot mutate the question bank
    f.as("student", 1);
    await assert.rejects(() => f.bank.getTeacherQuestionBank(1), /Tutor access/);

    // Admin adds a custom MCQ question to 1.1.1 (Match Up supports match & mcq)
    f.as("admin");
    const added = await f.bank.saveTeacherBankItem({
      formLevel: 1,
      checkpointId: "f1-1.1.1",
      item: {
        id: "",
        kind: "mcq",
        skill: "apply",
        prompt: "Custom teacher question: splitting a robotics build into chassis, sensors, and code is?",
        options: [
          { id: "a", text: "Decomposition (Leraian)" },
          { id: "b", text: "Abstraction (Peniskalaan)" },
          { id: "c", text: "Generalisation (Pengitlakan)" },
        ],
        answer: "a",
        explanation: "Breaking a build into subsystems is decomposition.",
      },
    });
    assert(added.itemId.startsWith("custom-f1-1.1.1-"));

    // Edit built-in question f1-1.1.1-q05
    await f.bank.saveTeacherBankItem({
      formLevel: 1,
      checkpointId: "f1-1.1.1",
      item: {
        id: "f1-1.1.1-q05",
        kind: "mcq",
        skill: "analyse",
        prompt: "Updated prompt by Cikgu: ignoring wrapper cartoons when baking 60 cupcakes uses?",
        options: [
          { id: "a", text: "Abstraction (Peniskalaan)" },
          { id: "b", text: "Decomposition (Leraian)" },
          { id: "c", text: "Pattern recognition" },
        ],
        answer: "a",
        explanation: "Updated teacher explanation.",
      },
    });

    // Delete built-in question f1-1.1.1-q01 (soft-hides it)
    await f.bank.deleteTeacherBankItem({
      formLevel: 1,
      checkpointId: "f1-1.1.1",
      itemId: "f1-1.1.1-q01",
    });

    const eff = await f.bank.loadEffectiveCurriculum(1);
    const cp = eff.chapters[0].checkpoints[0];
    assert.equal(cp.items.some((i) => i.id === "f1-1.1.1-q01"), false);
    assert.equal(cp.items.some((i) => i.id === added.itemId), true);
    assert.match(
      cp.items.find((i) => i.id === "f1-1.1.1-q05").prompt,
      /Updated prompt by Cikgu/,
    );

    // Restore f1-1.1.1-q01 back to textbook default
    await f.bank.restoreBuiltinBankItem({
      formLevel: 1,
      checkpointId: "f1-1.1.1",
      itemId: "f1-1.1.1-q01",
    });
    const effAfterRestore = await f.bank.loadEffectiveCurriculum(1);
    assert.equal(
      effAfterRestore.chapters[0].checkpoints[0].items.some(
        (i) => i.id === "f1-1.1.1-q01",
      ),
      true,
    );
  } finally {
    f.close();
  }
});

