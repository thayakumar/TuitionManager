const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const crypto = require("node:crypto");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function load(relative, stubs = {}, source) {
  const filename = path.join(root, relative);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(root);
  const original = m.require.bind(m);
  m.require = (name) =>
    Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  m._compile(
    ts.transpileModule(source ?? fs.readFileSync(filename, "utf8"), {
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
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-security-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  const db = load("lib/db.ts");
  return {
    dir,
    db,
    close() {
      db.getClient().close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

// These are real libSQL SQLite tests; only Next cookies/navigation are stubbed.
// No production database, external network or app source mutation is involved.
test("fresh concurrent initialization applies one migration and creates actual constraints", async () => {
  const f = fixture();
  try {
    let transactions = 0;
    const client = f.db.getClient();
    const original = client.transaction.bind(client);
    client.transaction = async (...args) => {
      transactions++;
      return original(...args);
    };
    await Promise.all(Array.from({ length: 8 }, () => f.db.ensureMigrated()));
    assert.equal(transactions, 1);
    assert.equal(
      Number((await f.db.queryOne("SELECT value FROM settings WHERE key='app_schema_version'")).value),
      f.db.SCHEMA_VERSION,
    );
    assert.equal((await f.db.queryOne("PRAGMA foreign_keys")).foreign_keys, 1);
    const indexes = await f.db.queryAll(
      "SELECT name FROM sqlite_master WHERE type='index'",
    );
    assert.ok(
      indexes.some((row) => row.name === "idx_students_username_casefold"),
    );
    assert.ok(indexes.some((row) => row.name === "idx_submissions_unique"));
    await f.db.execute(
      "INSERT INTO students(name,username) VALUES ('A','alice')",
    );
    await assert.rejects(
      () =>
        f.db.execute(
          "INSERT INTO students(name,username) VALUES ('B','Alice')",
        ),
      /UNIQUE/,
    );
  } finally {
    f.close();
  }
});

test("a cold process with a prepared schema uses one version read and zero DDL or write transactions", async () => {
  const f = fixture();
  try {
    await f.db.ensureMigrated();
    const cold = load("lib/db.ts");
    const client = cold.getClient();
    let calls = 0,
      transactions = 0;
    const original = client.execute.bind(client);
    client.execute = async (statement) => {
      calls++;
      assert.equal(statement, "SELECT value FROM settings WHERE key='app_schema_version'");
      return original(statement);
    };
    const tx = client.transaction.bind(client);
    client.transaction = async (...args) => {
      transactions++;
      return tx(...args);
    };
    await Promise.all(Array.from({ length: 8 }, () => cold.ensureMigrated()));
    assert.equal(calls, 1);
    assert.equal(transactions, 0);
    client.close();
  } finally {
    f.close();
  }
});

test("legacy schema preserves all duplicate work and grades as version history", async () => {
  const f = fixture();
  try {
    const source = fs.readFileSync(path.join(root, "tests/fixtures/legacy-db.ts.txt"), "utf8");
    const legacy = load("lib/db.ts", {}, source);
    await legacy.migrate();
    await legacy.execute(
      "INSERT INTO students(name,username,password) VALUES ('Alice','alice','testpass')",
    );
    await legacy.execute(
      "INSERT INTO posts(type,title,student_id) VALUES ('assignment','Work',1)",
    );
    await legacy.execute("DROP INDEX IF EXISTS idx_submissions_unique");
    await legacy.execute(
      "INSERT INTO submissions(post_id,student_id,content,grade,feedback,submitted_at,graded_at) VALUES(1,1,'First work','5','First feedback','2026-01-01 00:00:00','2026-01-02 00:00:00'),(1,1,'Second work','8','Second feedback','2026-02-01 00:00:00','2026-02-02 00:00:00')",
    );
    await legacy.execute(
      "INSERT INTO settings(key,value) VALUES ('student_session_1','old-token')",
    );
    legacy.getClient().close();
    await f.db.ensureMigrated();
    const current = await f.db.queryAll(
      "SELECT id,content,version,grade FROM submissions",
    );
    assert.equal(current.length, 1);
    assert.equal(current[0].content, "Second work");
    assert.equal(current[0].version, 2);
    const history = await f.db.queryAll(
      "SELECT version,content,grade,feedback FROM submission_versions ORDER BY version",
    );
    assert.deepEqual(
      history.map((a) => [a.version, a.content, a.grade]),
      [
        [1, "First work", "5"],
        [2, "Second work", "8"],
      ],
    );
    assert.equal(
      (
        await f.db.queryAll(
          "SELECT key FROM settings WHERE key LIKE 'student_session_%'",
        )
      ).length,
      0,
    );
    const rerun = load("lib/db.ts");
    await rerun.migrate();
    assert.equal(
      (await rerun.queryAll("SELECT id FROM submission_versions")).length,
      2,
    );
    rerun.getClient().close();
  } finally {
    f.close();
  }
});

test("expired, forged, deactivated and legacy student sessions are denied; logout targets only caller token", async () => {
  const f = fixture();
  try {
    await f.db.ensureMigrated();
    await f.db.execute(
      "INSERT INTO students(name,active) VALUES ('Alice',1),('Bob',1)",
    );
    const jar = new Map();
    const auth = load("lib/auth.ts", {
      "./db": f.db,
      "next/headers": {
        cookies: async () => ({
          get: (name) => (jar.has(name) ? { value: jar.get(name) } : undefined),
          set: (name, value) => jar.set(name, value),
          delete: (name) => jar.delete(name),
        }),
      },
      "next/navigation": {
        redirect: (destination) => {
          throw new Error("REDIRECT:" + destination);
        },
      },
    });
    jar.set("student_session", "1:old-token");
    assert.equal(await auth.getStudentSession(), null);
    await auth.createStudentSession(1);
    const token = jar.get("student_session");
    assert.equal(token.length, 64);
    assert.equal(await auth.getStudentSession(), 1);
    const stored = await f.db.queryOne(
      "SELECT token FROM student_sessions WHERE student_id=1",
    );
    assert.notEqual(stored.token, token);
    await f.db.execute("UPDATE students SET active=0 WHERE id=1");
    assert.equal(await auth.getStudentSession(), null);
    await f.db.execute("UPDATE students SET active=1 WHERE id=1");
    await f.db.execute(
      "UPDATE student_sessions SET expires_at='2000-01-01 00:00:00' WHERE student_id=1",
    );
    assert.equal(await auth.getStudentSession(), null);
    await auth.createStudentSession(1);
    const first = jar.get("student_session");
    await auth.createStudentSession(1);
    jar.set("student_session", first);
    assert.equal(await auth.getStudentSession(), null);
    await auth.createStudentSession(2);
    jar.set("student_session", "a".repeat(64));
    await auth.destroyStudentSession();
    assert.equal(
      (
        await f.db.queryAll(
          "SELECT id FROM student_sessions WHERE student_id=2",
        )
      ).length,
      1,
    );
    jar.set("admin_session", "anything");
    assert.equal(await auth.verifyAdminSession(), false);
    await assert.rejects(
      () => auth.requireAdminPage(),
      /REDIRECT:\/portal\/admin/,
    );
    await auth.createAdminSession();
    assert.equal(await auth.verifyAdminSession(), true);
    await auth.destroyAdminSession();
    assert.equal(await auth.verifyAdminSession(), false);
  } finally {
    f.close();
  }
});

test("transaction rollback leaves no partial domain rows", async () => {
  const f = fixture();
  try {
    await f.db.ensureMigrated();
    await assert.rejects(
      () =>
        f.db.withTransaction(async (tx) => {
          await tx.execute("INSERT INTO students(name) VALUES ('Rollback')");
          throw new Error("simulate failure");
        }),
      /simulate failure/,
    );
    assert.equal(
      (await f.db.queryAll("SELECT id FROM students WHERE name='Rollback'"))
        .length,
      0,
    );
  } finally {
    f.close();
  }
});

test("upload denies anonymous/malformed requests and derives student identity before the connector", async () => {
  const f = fixture();
  const previousUrl = process.env.APPS_SCRIPT_UPLOAD_URL;
  const originalFetch = global.fetch;
  let admin = false,
    sid = null,
    sent;
  try {
    await f.db.ensureMigrated();
    await f.db.execute("INSERT INTO students(name) VALUES ('Alice')");
    process.env.APPS_SCRIPT_UPLOAD_URL = "https://example.invalid/connector";
    const route = load("app/api/upload/route.ts", {
      "@/lib/auth": {
        verifyAdminSession: async () => admin,
        getStudentSession: async () => sid,
      },
      "@/lib/db": f.db,
      "@/lib/upload-limits": load("lib/upload-limits.ts"),
      "next/server": { NextResponse: Response },
    });
    const request = (file) => {
      const form = new FormData();
      form.set("studentName", "Spoofed Bob");
      if (file !== undefined) form.set("file", file);
      return new Request("https://app.example.invalid/api/upload", {
        method: "POST",
        body: form,
      });
    };
    assert.equal(
      (
        await route.POST(
          request(new File(["text"], "test.pdf", { type: "application/pdf" })),
        )
      ).status,
      401,
    );
    sid = 1;
    assert.equal((await route.POST(request("not a file"))).status, 400);
    assert.equal(
      (
        await route.POST(
          request(new File(["script"], "bad.svg", { type: "image/svg+xml" })),
        )
      ).status,
      400,
    );
    global.fetch = async (url, options) => {
      sent = JSON.parse(options.body);
      return Response.json({
        success: true,
        fileUrl: "https://example.invalid/uploaded.pdf",
        fileName: "uploaded.pdf",
      });
    };
    const response = await route.POST(
      request(
        new File(["%PDF-1.7\nFAKE AUDIT"], "test.pdf", {
          type: "application/pdf",
        }),
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(sent.studentName, "Alice");
    assert.notEqual(sent.studentName, "Spoofed Bob");
    global.fetch = async () =>
      Response.json({ success: true, fileUrl: "javascript:bad()" });
    assert.equal(
      (
        await route.POST(
          request(
            new File(["%PDF-1.7\nFAKE AUDIT"], "test.pdf", {
              type: "application/pdf",
            }),
          ),
        )
      ).status,
      502,
    );
  } finally {
    global.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.APPS_SCRIPT_UPLOAD_URL;
    else process.env.APPS_SCRIPT_UPLOAD_URL = previousUrl;
    f.close();
  }
});

test("CSV export neutralizes formula cells while preserving ordinary row data", async () => {
  const f = fixture();
  try {
    await f.db.ensureMigrated();
    await f.db.execute(
      "INSERT INTO students(name,phone) VALUES ('=SUM(1,1)','+6012345')",
    );
    const exports = load("lib/export.ts", {
      "./db": f.db,
      "./auth": { verifyAdminSession: async () => true },
    });
    const csv = await exports.exportStudentsCsv();
    assert.ok(csv.includes('"\'=SUM(1,1)"'));
    assert.ok(csv.includes("'+6012345"));
    const denied = load("lib/export.ts", {
      "./db": f.db,
      "./auth": { verifyAdminSession: async () => false },
    });
    await assert.rejects(() => denied.exportStudentsCsv(), /Unauthorized/);
  } finally {
    f.close();
  }
});

test("JaaS token grants only its authorized room", async () => {
  const previous = Object.fromEntries(
    ["JAAS_APP_ID", "JAAS_API_KEY_ID", "JAAS_PRIVATE_KEY"].map((key) => [
      key,
      process.env[key],
    ]),
  );
  try {
    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.JAAS_APP_ID = "audit-app";
    process.env.JAAS_API_KEY_ID = "audit-key";
    process.env.JAAS_PRIVATE_KEY = pair.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    const jaas = load("lib/jaas.ts");
    const token = await jaas.generateJaasJwt({
      room: "OnlyThisRoom",
      userName: "Alice",
      isModerator: false,
      userId: "1",
    });
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    assert.equal(payload.room, "OnlyThisRoom");
    assert.equal(payload.sub, "audit-app");
    await assert.rejects(
      () =>
        jaas.generateJaasJwt({
          room: "*",
          userName: "Alice",
          isModerator: false,
          userId: "1",
        }),
      /specific meeting room/,
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("independent concurrent writers are serialized and a failed write does not poison the queue", async () => {
  const f = fixture();
  try {
    await f.db.ensureMigrated();
    await Promise.all(
      [1, 2].map((n) =>
        f.db.withTransaction(async (tx) => {
          await tx.execute({
            sql: "INSERT INTO students(name) VALUES (?)",
            args: ["Concurrent" + n],
          });
          await new Promise((resolve) => setTimeout(resolve, 5));
        }),
      ),
    );
    assert.equal(
      (
        await f.db.queryAll(
          "SELECT id FROM students WHERE name LIKE 'Concurrent%'",
        )
      ).length,
      2,
    );
    await assert.rejects(
      () =>
        f.db.withTransaction(async () => {
          throw new Error("Expected");
        }),
      /Expected/,
    );
    await f.db.withTransaction(async (tx) => {
      await tx.execute("INSERT INTO students(name) VALUES ('After failure')");
    });
    assert.equal(
      (
        await f.db.queryAll(
          "SELECT id FROM students WHERE name='After failure'",
        )
      ).length,
      1,
    );
  } finally {
    f.close();
  }
});

test("legacy migration attributes MYT midnight invoice/recurrence bounds to the local calendar month/day", async () => {
  const f = fixture();
  let cold;
  try {
    await f.db.ensureMigrated();
    await f.db.execute("INSERT INTO students(id,name,username) VALUES(1,'Legacy','legacy')");
    await f.db.execute("INSERT INTO invoices(student_id,invoice_number,period_start,period_end,total_amount) VALUES(1,'LEGACY-MYT','2026-10-31T16:00:00Z','2026-11-30T15:59:59Z',80)");
    await f.db.execute("INSERT INTO recurrences(id,student_id,day_of_week,time,start_date) VALUES(1,1,4,'00:30','2026-12-01')");
    await f.db.execute("INSERT INTO classes(student_id,scheduled_at,recurrence_id) VALUES(1,'2026-12-30T16:30:00Z',1)");
    await f.db.execute("UPDATE settings SET value='1' WHERE key='app_schema_version'");
    cold = load("lib/db.ts");
    await cold.ensureMigrated();
    assert.equal((await cold.queryOne("SELECT billing_month FROM invoices WHERE invoice_number='LEGACY-MYT'")).billing_month, "2026-11");
    assert.equal((await cold.queryOne("SELECT generated_through FROM recurrences WHERE id=1")).generated_through, "2026-12-31");
  } finally {
    cold?.getClient().close();
    f.close();
  }
});

test("Turso-style PRAGMA write restrictions allow fresh migration, login data reads, and cold reuse", async () => {
  const f = fixture();
  let cold;
  const restrict = (client) => {
    const wrap = (target) => {
      for (const method of ["execute", "executeMultiple"]) {
        const original = target[method].bind(target);
        target[method] = async (...args) => {
          const sql = typeof args[0] === "string" ? args[0] : args[0].sql;
          if (/PRAGMA\s+user_version\s*=/i.test(sql)) throw Error("SQL_PARSE_ERROR: SQL not allowed statement: PRAGMA user_version");
          return original(...args);
        };
      }
    };
    wrap(client);
    const transaction = client.transaction.bind(client);
    client.transaction = async (...args) => { const tx = await transaction(...args); wrap(tx); return tx; };
  };
  try {
    restrict(f.db.getClient());
    await f.db.ensureMigrated();
    assert.equal((await f.db.queryOne("SELECT value FROM settings WHERE key='admin_username'")).value, "admin");
    assert.equal((await f.db.queryOne("SELECT value FROM settings WHERE key='app_schema_version'")).value, String(f.db.SCHEMA_VERSION));
    await f.db.execute("UPDATE settings SET value='custom-login' WHERE key='admin_username'");
    cold = load("lib/db.ts");
    restrict(cold.getClient());
    await cold.ensureMigrated();
    assert.equal((await cold.queryOne("SELECT value FROM settings WHERE key='admin_username'")).value, "custom-login");
  } finally { cold?.getClient().close(); f.close(); }
});
