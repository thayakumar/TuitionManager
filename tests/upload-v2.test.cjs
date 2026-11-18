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
test("resumable upload uses bounded same-origin chunks for a file above4MB and reports progress", async () => {
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
      assert.equal(url, "/api/upload/chunk");
      assert(options.body.size <= 2 * 1024 * 1024);
      offset += options.body.size;
      return Response.json({
        complete: offset === 10 * 1024 * 1024,
        nextOffset: offset,
      });
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
    assert.equal(calls.filter((c) => c.options.body instanceof Blob).length, 5);
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
          verifyAdminSession: async () => ["admin", "both"].includes(role),
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
    assert.equal(writes[0][1][4], "application/pdf", "registry retains inferred MIME even when connector omits fileType");
    role = "both";
    const mixedBeginRequest = jsonRequest({
      action: "begin",
      fileName: "work.pdf",
      fileType: "application/pdf",
      size: 9999999,
    });
    mixedBeginRequest.headers.set("x-upload-role", "student");
    const mixedBegin = await route.POST(mixedBeginRequest);
    const mixedTicket = (await mixedBegin.json()).ticket;
    const mixedFinishRequest = jsonRequest({
      action: "finish",
      ticket: mixedTicket,
      fileName: "work.pdf",
    });
    mixedFinishRequest.headers.set("x-upload-role", "student");
    assert.equal((await route.POST(mixedFinishRequest)).status, 200);
    assert.deepEqual(writes.at(-1)[1].slice(0, 3), [
      "examplefileid",
      "student",
      1,
    ]);
    role = "student";
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
    await db.execute(
      "UPDATE submissions SET file_url='https://drive.google.com/file/d/legacypublicfile/view' WHERE post_id=1",
    );
    const previousReads = reads;
    const legacy = await route.GET(req(), {
      params: Promise.resolve({ fileId: "legacypublicfile" }),
    });
    assert.equal(legacy.status, 302);
    assert.equal(
      legacy.headers.get("location"),
      "https://drive.google.com/thumbnail?id=legacypublicfile&sz=w2000",
    );
    assert.equal(
      reads,
      previousReads,
      "Unregistered legacy links never acquire service-owner access",
    );
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

test("chunk relay authenticates signed sessions, bounds request size and forwards Google acknowledgements", async () => {
  const savedFetch = global.fetch;
  let admin = true,
    sid = null,
    forwarded = 0;
  const load = loader({
    "@/lib/auth": {
      verifyAdminSession: async () => admin,
      getStudentSession: async () => sid,
    },
    "@/lib/storage-config": {
      getStorageSecret: async () => "chunk-test-secret",
    },
    "next/server": { NextResponse: Response },
  });
  const auth = load("lib/upload-authority.ts"),
    route = load("app/api/upload/chunk/route.ts");
  const ticket = (values) =>
    auth.signUpload(
      {
        fileId: "chunkfileid",
        actor: "admin",
        expires: Date.now() + 60000,
        size: 524288,
        mimeType: "image/png",
        uploadUrl:
          "https://www.googleapis.com/upload/drive/v3/files?upload_id=test",
        ...values,
      },
      "chunk-test-secret",
    );
  const req = (
    token,
    range = "bytes 0-262143/524288",
    bytes = 262144,
    origin = "https://app.test",
  ) =>
    new Request("https://app.test/api/upload/chunk", {
      method: "PUT",
      headers: {
        "content-type": "application/octet-stream",
        "content-range": range,
        "x-upload-ticket": token,
        origin,
      },
      body: bytes ? new Uint8Array(bytes) : undefined,
    });
  try {
    global.fetch = async (url, options) => {
      forwarded++;
      assert(
        String(url).startsWith("https://www.googleapis.com/upload/drive/"),
      );
      assert.equal(options.redirect, "manual");
      return new Response(null, {
        status: 308,
        headers: { range: "bytes=0-262143" },
      });
    };
    let r = await route.PUT(req(ticket({})));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { complete: false, nextOffset: 262144 });
    assert.equal((await route.PUT(req("bad"))).status, 403);
    assert.equal(
      (
        await route.PUT(
          req(
            ticket({}),
            "bytes 0-262143/524288",
            262144,
            "https://foreign.test",
          ),
        )
      ).status,
      403,
    );
    assert.equal((await route.PUT(req(ticket({ expires: 0 })))).status, 403);
    assert.equal(
      (await route.PUT(req(ticket({ uploadUrl: "http://127.0.0.1/private" }))))
        .status,
      403,
    );
    assert.equal(
      (
        await route.PUT(
          req(
            ticket({ size: 4 * 1024 * 1024 }),
            "bytes 0-3145727/4194304",
            3 * 1024 * 1024,
          ),
        )
      ).status,
      413,
    );
    assert.equal(
      (await route.PUT(req(ticket({}), "bytes 0-262143/999999"))).status,
      400,
    );
    admin = false;
    assert.equal((await route.PUT(req(ticket({})))).status, 401);
    sid = 1;
    assert.equal(
      (await route.PUT(req(ticket({ actor: "student:2" })))).status,
      401,
    );
    admin = true; // Both cookies may exist: the signed student identity must still be respected.
    r = await route.PUT(req(ticket({ actor: "student:1" })));
    assert.equal(r.status, 200);
    global.fetch = async () => new Response(null, { status: 201 });
    assert.deepEqual(
      await (await route.PUT(req(ticket({ actor: "student:1" })))).json(),
      { complete: true, nextOffset: 524288 },
    );
    global.fetch = async () => {
      throw new TypeError("network");
    };
    r = await route.PUT(req(ticket({ actor: "student:1" })));
    assert.equal(r.status, 503);
    assert.equal((await r.json()).retryable, true);
    assert.equal(
      forwarded,
      2,
      "Invalid or oversized requests must never reach Google",
    );
  } finally {
    global.fetch = savedFetch;
  }
});

test("meeting editor can explicitly upload as student outside the portal URL", async () => {
  const previousFetch = global.fetch;
  const previousWindow = global.window;
  const seen = [];
  global.window = { location: { pathname: '/meeting/55' } };
  global.fetch = async (url, options) => {
    if (url === '/api/upload/chunk') return Response.json({ complete: true, nextOffset: 3 });
    seen.push(options.headers['X-Upload-Role']);
    return Response.json(JSON.parse(options.body).action === 'begin'
      ? { ticket: 'signed' }
      : { fileUrl: 'https://drive.google.com/file/d/studentmeetingimage/view', fileName: 'note.png' });
  };
  try {
    await loader()('lib/upload-client.ts').uploadFile(new File(['abc'], 'note.png', {type:'image/png'}), { role: 'student' });
    assert.deepEqual(seen, ['student', 'student']);
  } finally { global.fetch = previousFetch; if (previousWindow === undefined) delete global.window; else global.window = previousWindow; }
});

test('parent upload binds a revocable bearer identity even with both session cookies', async () => {
  const previousFetch=global.fetch, previousUrl=process.env.APPS_SCRIPT_UPLOAD_URL;
  process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';
  let revoked=false, calls=0;const writes=[];
  const load=loader({
    '@/lib/auth':{verifyAdminSession:async()=>true,getStudentSession:async()=>2},
    '@/lib/parent-upload':{parentUploadIdentity:async token=>token==='family-one'&&!revoked?{studentId:1,parentTokenHash:'family-hash'}:null},
    '@/lib/db':{execute:async(...args)=>writes.push(args),queryOne:async()=>({name:'Alice'})},
    '@/lib/storage-config':{getStorageSecret:async()=>'secret'},'next/server':{NextResponse:Response}
  });
  const route=load('app/api/upload/route.ts'),authority=load('lib/upload-authority.ts');
  function request(body,token='family-one'){return new Request('https://app.test/api/upload',{method:'POST',headers:{origin:'https://app.test','Content-Type':'application/json','X-Upload-Role':'parent','X-Parent-Token':token},body:JSON.stringify(body)})}
  global.fetch=async(_url,options)=>{calls++;return Response.json(JSON.parse(options.body).action==='begin'?{success:true,version:2,uploadUrl:'https://www.googleapis.com/upload/drive/v3/files?upload_id=parent',fileId:'parentuploadfile'}:{success:true,version:2,created:true,fileId:'parentuploadfile',fileUrl:'https://drive.google.com/file/d/parentuploadfile/view',fileName:'family.pdf'})};
  try{
    assert.equal((await route.POST(request({action:'begin',fileName:'family.pdf',size:9},'wrong'))).status,401);
    const begin=await route.POST(request({action:'begin',fileName:'family.pdf',size:9}));assert.equal(begin.status,200);
    const ticket=(await begin.json()).ticket;assert.equal(authority.verifyUpload(ticket,'secret').actor,'parent:family-hash');
    const finished=await route.POST(request({action:'finish',ticket,fileName:'family.pdf'}));assert.equal(finished.status,200);
    assert.match((await finished.json()).inlineUrl,/parent_token=family-one/);
    assert.deepEqual(writes[0][1].slice(0,3),['parentuploadfile','student',1]);assert.equal(writes[0][1][5],'family-hash');
    revoked=true;const before=calls;assert.equal((await route.POST(request({action:'finish',ticket}))).status,401);assert.equal(calls,before);
    assert.equal(authority.ticketAllows(authority.verifyUpload(ticket,'secret'),{admin:true,studentId:null},'parentuploadfile'),false);
  } finally {global.fetch=previousFetch;if(previousUrl===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=previousUrl}
});

test('parent client sends its bearer only to same-origin transfer endpoints',async()=>{
  const previous=global.fetch,seen=[];
  global.fetch=async(url,options)=>{assert(url.startsWith('/api/upload'));seen.push(options.headers['X-Parent-Token']);return Response.json(url.endsWith('/chunk')?{complete:true,nextOffset:3}:JSON.parse(options.body).action==='begin'?{ticket:'signed'}:{fileUrl:'https://drive.google.com/file/d/parentuploadfile/view',fileName:'note.png'})};
  try{await loader()('lib/upload-client.ts').uploadFile(new File(['abc'],'note.png',{type:'image/png'}),{role:'parent',parentToken:'private-family-token'});assert.deepEqual(seen,['private-family-token','private-family-token','private-family-token'])}finally{global.fetch=previous}
});

test('parent chunk tickets reject another parent or revoked token before forwarding bytes',async()=>{
  let revoked=false;const load=loader({
    '@/lib/auth':{verifyAdminSession:async()=>true,getStudentSession:async()=>9},
    '@/lib/parent-upload':{parentUploadIdentity:async t=>t==='valid-parent'&&!revoked?{studentId:1,parentTokenHash:'bound-parent'}:null},
    '@/lib/storage-config':{getStorageSecret:async()=>'secret'},'next/server':{NextResponse:Response}
  });const route=load('app/api/upload/chunk/route.ts'),{signUpload}=load('lib/upload-authority.ts');
  const ticket=signUpload({fileId:'parentimagefile',actor:'parent:bound-parent',size:3,uploadUrl:'https://www.googleapis.com/upload/drive/v3/files?upload_id=parent',expires:Date.now()+10000},'secret');
  const request=(token)=>new Request('https://app.test/api/upload/chunk',{method:'PUT',headers:{Origin:'https://app.test','X-Upload-Ticket':ticket,'X-Parent-Token':token,'Content-Range':'bytes 0-2/3'},body:'abc'});
  const prev=global.fetch;let forwarded=0;global.fetch=async()=>{forwarded++;return Response.json({},{status:201})};
  try {assert.equal((await route.PUT(request('other'))).status,401);assert.equal((await route.PUT(request('valid-parent'))).status,200);assert.equal(forwarded,1);revoked=true;assert.equal((await route.PUT(request('valid-parent'))).status,401);assert.equal(forwarded,1)}finally{global.fetch=prev}
});
