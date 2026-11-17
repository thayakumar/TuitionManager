const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const crypto = require("node:crypto");
const ts = require("typescript");
const { NextRequest } = require("next/server");
const root = path.resolve(__dirname, "..");
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-whiteboards-"));
  process.env.TURSO_DATABASE_URL = "file:" + path.join(dir, "db.sqlite");
  delete process.env.TURSO_AUTH_TOKEN;
  const cache = new Map(),
    cookies = new Map(),
    tokens = { admin: "a".repeat(64), 1: "b".repeat(64), 2: "c".repeat(64) };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(root);
    cache.set(filename, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (name === "next/headers")
        return {
          cookies: async () => ({
            get: (name) =>
              cookies.has(name) ? { value: cookies.get(name) } : undefined,
          }),
        };
      if (name === "next/navigation")
        return {
          redirect: (url) => {
            throw Error("REDIRECT:" + url);
          },
        };
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
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
  const db = load("lib/db.ts"),
    boards = load("lib/whiteboards.ts"),
    route = load("app/api/whiteboards/[boardId]/route.ts");
  return {
    db,
    boards,
    route,
    load,
    cookies,
    tokens,
    async seed() {
      await db.ensureMigrated();
      await db.execute(
        "INSERT INTO students(id,name,active) VALUES(1,'Alice',1),(2,'Bob',1)",
      );
      await db.execute(
        "INSERT INTO classes(id,student_id,scheduled_at,status) VALUES(1,1,'2026-10-10T01:00:00Z','completed'),(2,2,'2026-10-11T01:00:00Z','canceled')",
      );
      await db.execute(
        "INSERT INTO admin_sessions(token,expires_at) VALUES(?,datetime('now','+1 day'))",
        [tokens.admin],
      );
      for (const sid of [1, 2])
        await db.execute(
          "INSERT INTO student_sessions(student_id,token,expires_at) VALUES(?,?,datetime('now','+1 day'))",
          [sid, crypto.createHash("sha256").update(tokens[sid]).digest("hex")],
        );
    },
    as(role, sid = 1) {
      cookies.clear();
      if (role === "admin") cookies.set("admin_session", tokens.admin);
      if (role === "student") cookies.set("student_session", tokens[sid]);
    },
    request(method = "GET", body, headers = {}) {
      return new NextRequest("http://localhost:4630/api/whiteboards/class-1", {
        method,
        headers: {
          ...(method === "PUT"
            ? {
                origin: "http://localhost:4630",
                "content-type": "application/json",
              }
            : {}),
          ...headers,
        },
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      });
    },
    context(boardId = "class-1") {
      return { params: Promise.resolve({ boardId }) };
    },
    close() {
      db.getClient().close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("whiteboards require current sessions, class ownership and active students; parents cannot access", async () => {
  const f = fixture();
  try {
    await f.seed();
    f.as("anonymous");
    assert.equal((await f.route.GET(f.request(), f.context())).status, 401);
    f.cookies.set("share_token", "parent-link");
    assert.equal((await f.route.GET(f.request(), f.context())).status, 401);
    f.as("student", 2);
    assert.equal((await f.route.GET(f.request(), f.context())).status, 404);
    assert.equal(
      (
        await f.route.PUT(
          f.request("PUT", { data: { elements: [] }, revision: 0 }),
          f.context(),
        )
      ).status,
      404,
    );
    f.as("student", 1);
    const response = await f.route.GET(f.request(), f.context());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: null,
      revision: 0,
      updatedAt: null,
    });
    assert.match(response.headers.get("cache-control"), /no-store/);
    await f.db.execute("UPDATE students SET active=0 WHERE id=1");
    assert.equal((await f.route.GET(f.request(), f.context())).status, 401);
    await f.db.execute("UPDATE students SET active=1 WHERE id=1");
    await f.db.execute("DELETE FROM student_sessions WHERE student_id=1");
    assert.equal(
      (
        await f.route.PUT(
          f.request("PUT", { data: { elements: [] }, revision: 0 }),
          f.context(),
        )
      ).status,
      401,
    );
    f.as("admin");
    assert.equal(
      (await f.route.GET(f.request(), f.context("class-2"))).status,
      200,
    );
    await f.db.execute("DELETE FROM admin_sessions");
    assert.equal(
      (await f.route.GET(f.request(), f.context("personal"))).status,
      401,
    );
  } finally {
    f.close();
  }
});

test("class board changes round-trip between tutor and student; stale and concurrent saves preserve server work", async () => {
  const f = fixture();
  try {
    await f.seed();
    f.as("student", 1);
    const initial = {
      elements: [{ id: "shape", type: "rectangle" }],
      appState: { zoom: { value: 1 } },
      files: {},
    };
    const first = await f.route.PUT(
      f.request("PUT", { data: initial, revision: 0 }),
      f.context(),
    );
    assert.equal(first.status, 200);
    assert.equal((await first.json()).revision, 1);
    f.as("admin");
    assert.deepEqual((await f.boards.readWhiteboard("class-1")).data, initial);
    const unchanged = await f.route.GET(
      f.request("GET", undefined, { "if-none-match": '"whiteboard-1"' }),
      f.context(),
    );
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), "");
    assert.equal(unchanged.headers.get("etag"), '"whiteboard-1"');
    const next = {
      ...initial,
      elements: [...initial.elements, { id: "text", text: "Tutor notes" }],
    };
    await f.boards.writeWhiteboard("class-1", next, 1);
    const changed = await f.route.GET(
      f.request("GET", undefined, { "if-none-match": '"whiteboard-1"' }),
      f.context(),
    );
    assert.equal(changed.status, 200);
    assert.equal(changed.headers.get("etag"), '"whiteboard-2"');
    assert.deepEqual((await changed.json()).data, next);
    f.as("student", 1);
    const stale = await f.route.PUT(
      f.request("PUT", {
        data: { elements: [{ id: "local-unsaved" }] },
        revision: 1,
      }),
      f.context(),
    );
    assert.equal(stale.status, 409);
    assert.deepEqual((await stale.json()).current.data, next);
    const saves = await Promise.allSettled([
      f.boards.writeWhiteboard("class-1", { elements: [{ id: "a" }] }, 2),
      f.boards.writeWhiteboard("class-1", { elements: [{ id: "b" }] }, 2),
    ]);
    assert.equal(saves.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      saves.filter((r) => r.status === "rejected" && r.reason.status === 409)
        .length,
      1,
    );
    assert.equal((await f.boards.readWhiteboard("class-1")).revision, 3);
    assert.equal(
      (await f.db.queryOne("SELECT count(*) n FROM whiteboards")).n,
      1,
    );
  } finally {
    f.close();
  }
});

test("personal board is admin-only and class-board persistence cascades with its lesson", async () => {
  const f = fixture();
  try {
    await f.seed();
    f.as("student", 1);
    assert.equal(
      (await f.route.GET(f.request(), f.context("personal"))).status,
      403,
    );
    assert.equal(
      (
        await f.route.PUT(
          f.request("PUT", { data: {}, revision: 0 }),
          f.context("personal"),
        )
      ).status,
      403,
    );
    f.as("admin");
    await f.boards.writeWhiteboard("personal", { elements: [] }, 0);
    await f.boards.writeWhiteboard(
      "class-1",
      { elements: [{ id: "lesson" }] },
      0,
    );
    await f.db.execute("DELETE FROM classes WHERE id=1");
    assert.equal(
      (
        await f.db.queryOne(
          "SELECT count(*) n FROM whiteboards WHERE board_key='class-1'",
        )
      ).n,
      0,
    );
    assert.equal((await f.boards.readWhiteboard("personal")).revision, 1);
    assert.equal(
      (await f.route.GET(f.request(), f.context("class-1"))).status,
      404,
    );
  } finally {
    f.close();
  }
});

test("whiteboard API rejects foreign origins, malformed JSON, invalid revisions and oversized workspaces", async () => {
  const f = fixture();
  try {
    await f.seed();
    f.as("admin");
    assert.equal(
      (
        await f.route.GET(
          f.request("GET", undefined, { origin: "https://foreign.example" }),
          f.context(),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.route.GET(
          f.request("GET", undefined, { "sec-fetch-site": "cross-site" }),
          f.context(),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.route.PUT(
          f.request(
            "PUT",
            { data: {}, revision: 0 },
            { origin: "https://foreign.example" },
          ),
          f.context(),
        )
      ).status,
      403,
    );
    const noOrigin = f.request("PUT", { data: {}, revision: 0 });
    noOrigin.headers.delete("origin");
    assert.equal((await f.route.PUT(noOrigin, f.context())).status, 403);
    assert.equal(
      (await f.route.PUT(f.request("PUT", "bad json"), f.context())).status,
      400,
    );
    for (const body of [
      { data: [], revision: 0 },
      { data: null, revision: 0 },
      { data: {}, revision: -1 },
      { data: {}, revision: 0.5 },
      { data: {} },
    ])
      assert.equal(
        (await f.route.PUT(f.request("PUT", body), f.context())).status,
        400,
      );
    assert.equal(
      (
        await f.route.PUT(
          f.request("PUT", {
            data: { text: "x".repeat(f.boards.MAX_WHITEBOARD_BYTES) },
            revision: 0,
          }),
          f.context(),
        )
      ).status,
      413,
    );
    assert.equal(
      (
        await f.route.PUT(
          f.request(
            "PUT",
            { data: {}, revision: 0 },
            { "content-length": String(2 * f.boards.MAX_WHITEBOARD_BYTES) },
          ),
          f.context(),
        )
      ).status,
      413,
    );
    assert.equal(
      (await f.route.GET(f.request(), f.context("class-01"))).status,
      404,
    );
    assert.equal(
      (await f.route.GET(f.request(), f.context("class-9007199254740992")))
        .status,
      404,
    );
    const inert = { elements: [{ text: "<script>alert(1)</script>" }] };
    const response = await f.route.PUT(
      f.request("PUT", { data: inert, revision: 0 }),
      f.context(),
    );
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual((await response.json()).data, inert);
  } finally {
    f.close();
  }
});

test("version-three upgrade only adds whiteboards and preserves existing history and classwork ordering", async () => {
  const f = fixture();
  let cold;
  try {
    await f.seed();
    await f.db.execute(
      "INSERT INTO posts(id,type,title,student_id,sort_order,max_points) VALUES(1,'assignment','Old work',1,77,99)",
    );
    await f.db.execute(
      "INSERT INTO submissions(id,post_id,student_id,content) VALUES(1,1,1,'Old attempt')",
    );
    await f.db.execute(
      "INSERT INTO submission_versions(submission_id,version,content,max_points,submitted_at) VALUES(1,1,'Old attempt',NULL,'2026-01-01')",
    );
    await f.db.execute("DROP TABLE whiteboards");
    await f.db.execute(
      "UPDATE settings SET value='3' WHERE key='app_schema_version'",
    );
    const source = fs.readFileSync(path.join(root, "lib/db.ts"), "utf8");
    const filename = path.join(root, "lib/db.ts"),
      m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(root);
    m._compile(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      filename,
    );
    cold = m.exports;
    await cold.ensureMigrated();
    assert.equal(cold.SCHEMA_VERSION, 4);
    assert.equal(
      (
        await cold.queryOne(
          "SELECT value FROM settings WHERE key='app_schema_version'",
        )
      ).value,
      "4",
    );
    assert.equal(
      (await cold.queryOne("SELECT count(*) n FROM whiteboards")).n,
      0,
    );
    assert.equal(
      (await cold.queryOne("SELECT sort_order FROM posts WHERE id=1"))
        .sort_order,
      77,
    );
    assert.equal(
      (
        await cold.queryOne(
          "SELECT max_points FROM submission_versions WHERE submission_id=1",
        )
      ).max_points,
      null,
    );
  } finally {
    cold?.getClient().close();
    f.close();
  }
});

test("whiteboard same-origin validation uses the browser-facing proxy host and protocol", async () => {
  const f = fixture();
  try {
    await f.seed();
    f.as("admin");
    const request = (headers, revision) =>
      new NextRequest("http://localhost:4634/api/whiteboards/class-1", {
        method: "PUT",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ data: { elements: [] }, revision }),
      });
    assert.equal(
      (
        await f.route.PUT(
          request(
            { host: "127.0.0.1:4634", origin: "http://127.0.0.1:4634" },
            0,
          ),
          f.context(),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await f.route.PUT(
          request(
            {
              host: "localhost:4634",
              "x-forwarded-host": "tuition.example",
              "x-forwarded-proto": "https",
              origin: "https://tuition.example",
            },
            1,
          ),
          f.context(),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await f.route.PUT(
          request(
            { host: "127.0.0.1:4634", origin: "https://foreign.example" },
            2,
          ),
          f.context(),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.route.PUT(
          request(
            {
              host: "localhost:4634",
              "x-forwarded-host": "tuition.example",
              "x-forwarded-proto": "https",
              origin: "https://foreign.example",
            },
            2,
          ),
          f.context(),
        )
      ).status,
      403,
    );
    assert.equal((await f.boards.readWhiteboard("class-1")).revision, 2);
  } finally {
    f.close();
  }
});
