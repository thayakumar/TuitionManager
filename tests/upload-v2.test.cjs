const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  Module = require("node:module"),
  ts = require("typescript");
const root = path.resolve(__dirname, "..");
function loader(stubs = {}) {
  const cache = new Map();
  return function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module);
    m.paths = Module._nodeModulePaths(root);
    m.filename = file;
    cache.set(file, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
      if (name.startsWith("."))
        return load(
          path.relative(root, path.resolve(path.dirname(file), name)) + ".ts",
        );
      return original(name);
    };
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
    return m.exports;
  };
}
function jsonRequest(body) {
  return new Request("https://app.test/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://app.test" },
    body: JSON.stringify(body),
  });
}
test("resumable upload bypasses the Vercel body path for a file above4MB and reports progress", async () => {
  const saved = global.fetch;
  const calls = [],
    progress = [];
  let offset = 0;
  try {
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === "/api/upload") {
        const data = JSON.parse(options.body);
        return Response.json(
          data.action === "begin"
            ? {
                uploadUrl:
                  "https://www.googleapis.com/upload/drive/v3/files?upload_id=example",
                ticket: "signed",
              }
            : {
                fileUrl: "https://drive.google.com/file/d/examplefileid/view",
                fileName: "large.zip",
                inlineUrl: "/api/files/examplefileid?inline=1",
              },
        );
      }
      offset += options.body.size;
      return offset < 10 * 1024 * 1024
        ? new Response(null, {
            status: 308,
            headers: { Range: "bytes=0-" + (offset - 1) },
          })
        : Response.json({ id: "examplefileid" });
    };
    const { uploadFile } = loader()("lib/upload-client.ts");
    const result = await uploadFile(
      new File([new Uint8Array(10 * 1024 * 1024)], "large.zip", {
        type: "application/zip",
      }),
      { onProgress: (n) => progress.push(n) },
    );
    assert.equal(result.fileName, "large.zip");
    assert.equal(calls.filter((c) => c.url === "/api/upload").length, 2);
    assert.equal(calls.filter((c) => c.options.body instanceof Blob).length, 2);
    assert.equal(progress.at(-1), 100);
    assert(
      calls
        .filter((c) => c.url === "/api/upload")
        .every((c) => typeof c.options.body === "string"),
    );
  } finally {
    global.fetch = saved;
  }
});
test("legacy upload fallback is explicit and large files do not hit unsupported multipart path", async () => {
  const original = global.fetch;
  let multipart = 0;
  try {
    global.fetch = async (url, options) => {
      if (typeof options.body === "string")
        return Response.json({ code: "CONNECTOR_UPGRADE" }, { status: 409 });
      multipart++;
      return Response.json({
        fileUrl: "https://example.com/file.pdf",
        fileName: "small.pdf",
      });
    };
    const { uploadFile } = loader()("lib/upload-client.ts");
    await uploadFile(
      new File(["%PDF-1.7"], "small.pdf", { type: "application/pdf" }),
    );
    assert.equal(multipart, 1);
    await assert.rejects(
      () =>
        uploadFile(
          new File([new Uint8Array(5 * 1024 * 1024)], "large.zip", {
            type: "application/zip",
          }),
        ),
      /one-time upgrade/,
    );
    assert.equal(multipart, 1);
  } finally {
    global.fetch = original;
  }
});
test("upload tickets bind created file, actor and expiry; private sharing warning retains createdmetadata", () => {
  const load = loader(),
    a = load("lib/upload-authority.ts"),
    { storageFile } = load("lib/storage-response.ts");
  const t = {
    fileId: "examplefileid",
    actor: "student:1",
    expires: Date.now() + 1000,
  };
  const token = a.signUpload(t, "secret");
  assert(
    a.ticketAllows(
      a.verifyUpload(token, "secret"),
      { admin: false, studentId: 1 },
      t.fileId,
    ),
  );
  assert(
    !a.ticketAllows(
      a.verifyUpload(token, "secret"),
      { admin: false, studentId: 2 },
      t.fileId,
    ),
  );
  assert.equal(a.verifyUpload(token + "x", "secret"), null);
  const result = storageFile({
    success: true,
    created: true,
    fileId: t.fileId,
    fileUrl: "https://drive.google.com/file/d/examplefileid/view",
    warning: "Private file served through class access",
  });
  assert.equal(result.fileId, t.fileId);
  assert(result.warning);
  assert.throws(
    () => storageFile({ success: false, error: "Permission denied" }),
    /Drive received/,
  );
});
test("begin/finish validates connector session target and binds registry ownership to the caller", async () => {
  let role = "student",
    sid = 1;
  const writes = [],
    savedFetch = global.fetch,
    savedUrl = process.env.APPS_SCRIPT_UPLOAD_URL;
  process.env.APPS_SCRIPT_UPLOAD_URL = "https://connector.test";
  try {
    const load = loader({
        "@/lib/auth": {
          verifyAdminSession: async () => role === "admin",
          getStudentSession: async () => sid,
        },
        "@/lib/db": {
          execute: async (...args) => writes.push(args),
          queryOne: async () => ({ name: "Alice" }),
        },
        "@/lib/storage-config": { getStorageSecret: async () => "secret" },
        "next/server": { NextResponse: Response },
      }),
      route = load("app/api/upload/route.ts");
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      return Response.json(
        body.action === "begin"
          ? {
              success: true,
              version: 2,
              uploadUrl:
                "https://www.googleapis.com/upload/drive/v3/files?upload_id=example",
              fileId: "examplefileid",
            }
          : {
              success: true,
              version: 2,
              created: true,
              fileId: "examplefileid",
              fileUrl: "https://drive.google.com/file/d/examplefileid/view",
              fileName: "work.pdf",
              warning: "Private",
            },
      );
    };
    const begin = await route.POST(
      jsonRequest({
        action: "begin",
        fileName: "work.pdf",
        fileType: "application/pdf",
        size: 9999999,
      }),
    );
    assert.equal(begin.status, 200);
    const ticket = (await begin.json()).ticket;
    const finish = await route.POST(
      jsonRequest({ action: "finish", ticket, fileName: "work.pdf" }),
    );
    assert.equal(finish.status, 200);
    assert.equal(
      (await finish.json()).inlineUrl,
      "/api/files/examplefileid?inline=1",
    );
    assert.deepEqual(writes[0][1].slice(0, 3), ["examplefileid", "student", 1]);
    sid = 2;
    assert.equal(
      (await route.POST(jsonRequest({ action: "finish", ticket }))).status,
      403,
    );
    global.fetch = async () =>
      Response.json({
        success: true,
        version: 2,
        uploadUrl: "https://attacker.test/upload/drive/v3/files",
        fileId: "examplefileid",
      });
    assert.notEqual(
      (
        await route.POST(
          jsonRequest({
            action: "begin",
            fileName: "work.pdf",
            fileType: "application/pdf",
            size: 100,
          }),
        )
      ).status,
      200,
    );
  } finally {
    global.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.APPS_SCRIPT_UPLOAD_URL;
    else process.env.APPS_SCRIPT_UPLOAD_URL = savedUrl;
  }
});
test("private attachments require registry ownership or tutor-authorized sharing, not student-pasted IDs", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-upload-scope-")),
    savedUrl = process.env.TURSO_DATABASE_URL,
    connector = process.env.APPS_SCRIPT_UPLOAD_URL,
    savedFetch = global.fetch;
  process.env.TURSO_DATABASE_URL = "file:" + path.join(dir, "db.sqlite");
  process.env.APPS_SCRIPT_UPLOAD_URL = "https://connector.test";
  let admin = false,
    sid = 1,
    reads = 0;
  const load = loader({
      "@/lib/auth": {
        verifyAdminSession: async () => admin,
        getStudentSession: async () => sid,
      },
      "@/lib/storage-config": { getStorageSecret: async () => "secret" },
      "next/server": { NextResponse: Response },
    }),
    db = load("lib/db.ts");
  try {
    await db.ensureMigrated();
    await db.execute(
      "INSERT INTO students(id,name)VALUES(1,'Alice'),(2,'Bob')",
    );
    await db.execute(
      "INSERT INTO posts(id,type,title,student_id,body)VALUES(1,'assignment','Test',1,'No files')",
    );
    await db.execute(
      "INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name)VALUES('foreignfileid','student',2,'private.png'),('ownfileimage','student',1,'own.png')",
    );
    await db.execute(
      "INSERT INTO submissions(post_id,student_id,content)VALUES(1,1,'<img src=\"/api/files/foreignfileid?inline=1\">')",
    );
    global.fetch = async () => {
      reads++;
      return Response.json({
        version: 2,
        success: true,
        base64: Buffer.from("image").toString("base64"),
        total: 5,
        nextOffset: 5,
        fileName: "own.png",
        mimeType: "image/png",
      });
    };
    const route = load("app/api/files/[fileId]/route.ts");
    const req = () => {
      const r = new Request("https://app.test/api/files/ownfileimage?inline=1");
      r.nextUrl = new URL(r.url);
      return r;
    };
    let response = await route.GET(req(), {
      params: Promise.resolve({ fileId: "foreignfileid" }),
    });
    assert.equal(response.status, 404);
    assert.equal(reads, 0);
    response = await route.GET(req(), {
      params: Promise.resolve({ fileId: "ownfileimage" }),
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "image");
    assert.equal(response.headers.get("Content-Type"), "image/png");
    await db.execute(
      "INSERT INTO post_attachments(post_id,file_name,file_url)VALUES(1,'shared','https://drive.google.com/file/d/sharedadminfile/view')",
    );
    response = await route.GET(req(), {
      params: Promise.resolve({ fileId: "sharedadminfile" }),
    });
    assert.equal(response.status, 200);
    await db.execute("UPDATE submissions SET file_url='https://drive.google.com/file/d/legacypublicfile/view' WHERE post_id=1");
    const previousReads=reads;
    const legacy=await route.GET(req(),{params:Promise.resolve({fileId:"legacypublicfile"})});
    assert.equal(legacy.status,302);
    assert.equal(legacy.headers.get("location"),"https://drive.google.com/file/d/legacypublicfile/view");
    assert.equal(reads,previousReads,"Unregistered legacy links never acquire service-owner access");
    sid = null;
    assert.equal(
      (
        await route.GET(req(), {
          params: Promise.resolve({ fileId: "ownfileimage" }),
        })
      ).status,
      401,
    );
  } finally {
    db.getClient().close();
    fs.rmSync(dir, { recursive: true, force: true });
    global.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = savedUrl;
    if (connector === undefined) delete process.env.APPS_SCRIPT_UPLOAD_URL;
    else process.env.APPS_SCRIPT_UPLOAD_URL = connector;
  }
});

test("recent Drive recovery is administrator-only and does not register foreign-origin selections", async () => {
  let admin = false;
  const writes = [],
    fetchBefore = global.fetch,
    urlBefore = process.env.APPS_SCRIPT_UPLOAD_URL;
  process.env.APPS_SCRIPT_UPLOAD_URL = "https://connector.test";
  try {
    global.fetch = async (_url, options) => {
      const data = JSON.parse(options.body);
      return Response.json(
        data.action === "list"
          ? {
              success: true,
              version: 2,
              files: [
                {
                  fileId: "recoveredfileid",
                  fileName: "Old image.png",
                  fileType: "image/png",
                  fileUrl:
                    "https://drive.google.com/file/d/recoveredfileid/view",
                },
              ],
            }
          : {
              success: true,
              version: 2,
              created: true,
              fileId: "recoveredfileid",
              fileName: "Old image.png",
              fileUrl: "https://drive.google.com/file/d/recoveredfileid/view",
            },
      );
    };
    const route = loader({
      "@/lib/auth": { verifyAdminSession: async () => admin },
      "@/lib/db": { execute: async (...args) => writes.push(args) },
      "@/lib/storage-config": { getStorageSecret: async () => "secret" },
      "next/server": { NextResponse: Response },
    })("app/api/upload/recent/route.ts");
    assert.equal((await route.GET()).status, 401);
    admin = true;
    assert.equal((await (await route.GET()).json()).files.length, 1);
    const foreign = new Request("https://app.test/api/upload/recent", {
      method: "POST",
      headers: {
        origin: "https://other.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId: "recoveredfileid" }),
    });
    assert.equal((await route.POST(foreign)).status, 403);
    assert.equal(writes.length, 0);
    const ok = jsonRequest({ fileId: "recoveredfileid" });
    const selected = await route.POST(ok);
    assert.equal(selected.status, 200);
    assert.equal(
      (await selected.json()).inlineUrl,
      "/api/files/recoveredfileid?inline=1",
    );
    assert.equal(writes.length, 1);
  } finally {
    global.fetch = fetchBefore;
    if (urlBefore === undefined) delete process.env.APPS_SCRIPT_UPLOAD_URL;
    else process.env.APPS_SCRIPT_UPLOAD_URL = urlBefore;
  }
});
test("storage setup secret creation requires admin and atomically reuses the existing value", async () => {
  let admin = false,
    value = "",
    inserts = 0;
  const before = process.env.APPS_SCRIPT_SHARED_SECRET;
  delete process.env.APPS_SCRIPT_SHARED_SECRET;
  try {
    const { getStorageSecret } = loader({
      "./db": {
        getSetting: async () => value,
        execute: async (_sql, args) => {
          inserts++;
          if (!value) value = args[0];
        },
      },
      "./auth": {
        requireAdmin: async () => {
          if (!admin) throw Error("Unauthorized");
        },
      },
    })("lib/storage-config.ts");
    assert.equal(await getStorageSecret(), "");
    await assert.rejects(
      () => getStorageSecret({ create: true }),
      /Unauthorized/,
    );
    admin = true;
    const a = await getStorageSecret({ create: true });
    assert.match(a, /^[a-f0-9]{64}$/);
    assert.equal(await getStorageSecret({ create: true }), a);
    assert.equal(inserts, 1);
    admin = false;
    await assert.rejects(
      () => getStorageSecret({ create: true }),
      /Unauthorized/,
    );
  } finally {
    if (before === undefined) delete process.env.APPS_SCRIPT_SHARED_SECRET;
    else process.env.APPS_SCRIPT_SHARED_SECRET = before;
  }
});
