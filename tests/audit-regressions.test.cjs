const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const crypto = require("node:crypto");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function createHarness(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-audit-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;

  const cookieMap = new Map();
  let role = options.role ?? "admin";
  let studentId = options.studentId ?? null;
  const cache = new Map();

  const cookiesStub = async () => ({
    get(name) {
      const value = cookieMap.get(name);
      return value ? { name, value } : undefined;
    },
    set(name, value) {
      cookieMap.set(name, value);
    },
    delete(name) {
      cookieMap.delete(name);
    },
  });

  const authStub = options.realAuth
    ? null
    : {
        verifyAdminSession: async () => role === "admin",
        getStudentSession: async () => (role === "student" ? studentId : null),
        createAdminSession: async () => {
          cookieMap.set("admin_session", "stub-admin");
        },
        destroyAdminSession: async () => {
          cookieMap.delete("admin_session");
        },
        createStudentSession: async (id) => {
          cookieMap.set("student_session", String(id));
        },
        destroyStudentSession: async () => {
          cookieMap.delete("student_session");
        },
      };

  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(root);
    cache.set(filename, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (name === "server-only") return {};
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/headers") return { cookies: cookiesStub };
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
      if (name === "next/server") {
        return {
          NextResponse: class NextResponse extends Response {
            static json(body, init) {
              return new Response(JSON.stringify(body), {
                ...init,
                headers: { "content-type": "application/json", ...(init?.headers || {}) },
              });
            }
          },
        };
      }
      if (authStub && (name === "./auth" || name === "@/lib/auth")) {
        return authStub;
      }
      if (name.startsWith("@/")) {
        const target = path.resolve(root, name.slice(2)) + ".ts";
        if (fs.existsSync(target)) return load(target);
      }
      if (name.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), name) + ".ts";
        if (fs.existsSync(target)) return load(target);
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
  return {
    dir,
    db,
    load,
    cookieMap,
    as(nextRole, sid = null) {
      role = nextRole;
      studentId = sid;
    },
    coldDb() {
      cache.delete(path.resolve(root, "lib/db.ts"));
      return load("lib/db.ts");
    },
    close() {
      db.getClient().close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function formData(values) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined && v !== null) f.set(k, String(v));
  }
  return f;
}

test("[SEC-01] plain-text file URL in family chat cannot authorize file access; verified inline image does; v10->v11 migration backfills & indexes", async () => {
  const h = createHarness();
  try {
    await h.db.ensureMigrated();
    await h.db.execute(
      "INSERT INTO students(id,name,username,password,hourly_rate) VALUES (1,'Alice','alice','pass1234',80),(2,'Bob','bob','pass1234',80)",
    );
    await h.db.execute(
      "INSERT INTO family_chat_rooms(student_id) VALUES (1),(2)",
    );

    const secretFileId = "secretFileId_1234567890";
    const legitFileId = "legitFileId_1234567890";
    await h.db.execute(
      "INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type) VALUES (?,'admin',NULL,'secret.png','image/png'),(?,'student',1,'alice-img.png','image/png')",
      [secretFileId, legitFileId],
    );

    // Register a post owned by Bob so secretFileId belongs elsewhere
    await h.db.execute(
      "INSERT INTO posts(id,student_id,type,title) VALUES (10,2,'material','Bob Notes')",
    );
    await h.db.execute(
      "INSERT INTO post_attachments(post_id,file_name,file_url,file_type) VALUES (10,'secret.png',?,'image/png')",
      [`/api/files/${secretFileId}`],
    );

    const chat = h.load("lib/family-chat.ts");
    const route = h.load("app/api/files/[fileId]/route.ts");

    // Alice tries to smuggle Bob's file ID as plain text in her family chat
    h.as("student", 1);
    const spoofed = await chat.mutateChat(
      1,
      {
        action: "send",
        clientId: crypto.randomUUID(),
        body: `<p>look at /api/files/${secretFileId}?inline=1" please</p>`,
        attachments: [],
      },
      { viewer: "student" },
    );
    const spoofRow = await h.db.queryOne(
      "SELECT inline_files FROM family_chat_messages WHERE id=?",
      [spoofed.message.id],
    );
    assert.equal(spoofRow.inline_files, "[]");

    // File route must deny Alice access to Bob's secretFileId
    const reqUrl = `http://localhost/api/files/${secretFileId}?inline=1`;
    const req = Object.assign(new Request(reqUrl), { nextUrl: new URL(reqUrl) });
    const denied = await route.GET(req, {
      params: Promise.resolve({ fileId: secretFileId }),
    });
    assert.equal(denied.status, 404);

    // Alice embeds her own verified uploaded image in family chat -> inline_files records it
    const legit = await chat.mutateChat(
      1,
      {
        action: "send",
        clientId: crypto.randomUUID(),
        body: `<p><img src="/api/files/${legitFileId}?inline=1" alt="diagram"></p>`,
        attachments: [],
      },
      { viewer: "student" },
    );
    const legitRow = await h.db.queryOne(
      "SELECT inline_files FROM family_chat_messages WHERE id=?",
      [legit.message.id],
    );
    assert.deepEqual(JSON.parse(legitRow.inline_files), [legitFileId]);

    // Verify all 6 v11 indexes exist
    const indexes = (
      await h.db.queryAll("SELECT name FROM sqlite_master WHERE type='index'")
    ).map((r) => r.name);
    for (const expected of [
      "idx_classes_jday",
      "idx_classes_status_jday",
      "idx_classes_student_status_jday",
      "idx_invoice_items_class",
      "idx_classes_rescheduled_from",
      "idx_reschedule_requests_class_status",
    ]) {
      assert.ok(indexes.includes(expected), `missing index ${expected}`);
    }

    // Verify v10 -> v11 upgrade backfills inline_files from legacy HTML messages
    await h.db.execute(
      "INSERT INTO family_chat_messages(room_id,author_role,author_key,client_id,body,inline_files,created_at) VALUES ((SELECT id FROM family_chat_rooms WHERE student_id=1),'admin','admin',?,?,'[]',datetime('now'))",
      [crypto.randomUUID(), `<p><img src="/api/files/legacyImg_1234567890?inline=1"></p>`],
    );
    await h.db.execute(
      "UPDATE settings SET value='10' WHERE key='app_schema_version'",
    );
    const cold = h.coldDb();
    await cold.ensureMigrated();
    const backfilled = await cold.queryOne(
      "SELECT inline_files FROM family_chat_messages WHERE body LIKE '%legacyImg_1234567890%'",
    );
    assert.deepEqual(JSON.parse(backfilled.inline_files), [
      "legacyImg_1234567890",
    ]);
  } finally {
    h.close();
  }
});

test("[BUG-01] admin chat route /chats/[studentId] exists and matches live notification href", () => {
  const routeFile = path.join(root, "app/chats/[studentId]/page.tsx");
  assert.ok(fs.existsSync(routeFile), "app/chats/[studentId]/page.tsx must exist");
  const source = fs.readFileSync(routeFile, "utf8");
  assert.match(source, /FamilyChat/);
  assert.match(source, /studentId/);
});

test("[SEC-02] admin login upgrades plaintext to scrypt, stores hashed session tokens, enforces rate limit, supports password change, and student quick-create uses random passwords", async () => {
  const h = createHarness({ realAuth: true });
  try {
    await h.db.ensureMigrated();
    await h.db.execute(
      "INSERT OR REPLACE INTO settings(key,value) VALUES ('admin_username','tutor'),('admin_password','legacy-plain-pw')",
    );

    const actions = h.load("lib/actions.ts");
    const auth = h.load("lib/auth.ts");

    // 1. Login with legacy plaintext upgrades stored password to scrypt$ hash and hashes session token
    const loginRes = await actions.loginAdmin(
      formData({ username: "tutor", password: "legacy-plain-pw" }),
    );
    assert.equal(loginRes.success, true);

    const storedPw = await h.db.getSetting("admin_password");
    assert.ok(storedPw.startsWith("scrypt$"), "admin_password must be upgraded to scrypt$");

    const rawCookie = h.cookieMap.get("admin_session");
    assert.ok(rawCookie, "admin_session cookie must be set");
    const hashed = crypto.createHash("sha256").update(rawCookie).digest("hex");
    const sessionRow = await h.db.queryOne("SELECT token FROM admin_sessions");
    assert.equal(sessionRow.token, hashed, "admin_sessions.token must store SHA-256 hash");
    assert.notEqual(sessionRow.token, rawCookie);
    assert.equal(await auth.verifyAdminSession(), true);

    // 2. Password change updates hash and rejects wrong current password
    const badChange = await actions.changeAdminPasswordAction(
      formData({
        current_password: "wrong",
        new_password: "NewStrongPassword99",
        confirm_password: "NewStrongPassword99",
      }),
    );
    assert.equal(badChange.success, false);

    const goodChange = await actions.changeAdminPasswordAction(
      formData({
        current_password: "legacy-plain-pw",
        new_password: "NewStrongPassword99",
        confirm_password: "NewStrongPassword99",
      }),
    );
    assert.equal(goodChange.success, true);

    // Old password no longer works
    const oldLogin = await actions.loginAdmin(
      formData({ username: "tutor", password: "legacy-plain-pw" }),
    );
    assert.equal(oldLogin.success, false);

    // New password succeeds
    const newLogin = await actions.loginAdmin(
      formData({ username: "tutor", password: "NewStrongPassword99" }),
    );
    assert.equal(newLogin.success, true);

    // 3. Student quick creation generates strong random password (never `${username}123`)
    const sid = await actions.createStudentQuick(
      formData({ name: "Siti Aminah", hourly_rate: "75" }),
    );
    const student = await h.db.queryOne(
      "SELECT username, password FROM students WHERE id=?",
      [sid],
    );
    assert.equal(student.username, "siti");
    assert.notEqual(student.password, "siti123");
    assert.ok(student.password.length >= 10, "generated student password should be >= 10 chars");

    // 4. Rate limit kicks in after 20 failed login attempts
    for (let i = 0; i < 20; i++) {
      const attempt = await actions.loginAdmin(
        formData({ username: "tutor", password: "bad-password" }),
      );
      assert.equal(attempt.success, false);
    }
    const blocked = await actions.loginAdmin(
      formData({ username: "tutor", password: "NewStrongPassword99" }),
    );
    assert.equal(blocked.success, false);
    assert.match(blocked.error, /too many/i);
  } finally {
    h.close();
  }
});

test("[DIR-01] generateMonthlyDraftsAction creates month-end draft invoices idempotently", async () => {
  const h = createHarness();
  try {
    await h.db.ensureMigrated();
    await h.db.execute(
      "INSERT INTO students(id,name,username,password,hourly_rate,active) VALUES (1,'Danial','danial','pw12345678',100,1)",
    );
    await h.db.execute(
      "INSERT INTO classes(student_id,scheduled_at,duration_minutes,status,attendance,is_trial) VALUES (1,'2026-03-10T04:00:00.000Z',60,'completed','present',0)",
    );

    const actions = h.load("lib/actions.ts");
    const first = await actions.generateMonthlyDraftsAction("2026-03");
    assert.equal(first.success, true);
    assert.equal(first.created, 1);
    assert.equal(first.alreadyProcessed, false);

    const second = await actions.generateMonthlyDraftsAction("2026-03");
    assert.equal(second.success, true);
    assert.equal(second.created, 0);
    assert.equal(second.alreadyProcessed, true);
  } finally {
    h.close();
  }
});

test("[ARCH-03] all domain errors extend DomainError for minification-safe MCP error handling", () => {
  const h = createHarness();
  try {
    const { DomainError, ActionValidationError } = h.load("lib/action-errors.ts");
    const { ClassroomAccessError } = h.load("lib/classroom-access.ts");
    const { WhiteboardError } = h.load("lib/whiteboards.ts");
    const { DocumentError } = h.load("lib/documents.ts");
    const { ChatError } = h.load("lib/family-chat.ts");
    const { DiagnosticError } = h.load("lib/diagnostics.ts");
    const { OAuthError } = h.load("lib/mcp/auth.ts");

    const instances = [
      new ActionValidationError("bad input"),
      new ClassroomAccessError(403, "denied"),
      new WhiteboardError(409, "stale"),
      new DocumentError(404, "missing"),
      new ChatError(400, "empty"),
      new DiagnosticError(409, "locked"),
      new OAuthError("invalid_grant", "expired", 400),
    ];
    for (const err of instances) {
      assert.ok(err instanceof DomainError, `${err.constructor.name} must extend DomainError`);
      assert.equal(typeof err.status, "number");
    }
  } finally {
    h.close();
  }
});
