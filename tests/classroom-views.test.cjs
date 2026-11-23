const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");

// These tests execute real route functions and history rendering with fake query/auth
// boundaries. Database/action integration and browser sessions are verified separately.
function fixture({
  authenticated = true,
  postOwner = 1,
  maxPoints = 100,
  fileOnly = false,
  viewerAdmin = false,
  latestGraded = false,
} = {}) {
  const queries = [];
  const current = {
    id: 10,
    version: 3,
    post_id: 5,
    student_id: 1,
    content: fileOnly ? null : "LATEST_WORK",
    file_url: fileOnly ? "https://example.com/attached-work.pdf" : null,
    grade: latestGraded ? "8" : null,
    max_points: latestGraded ? 10 : undefined,
    feedback: null,
    submitted_at: "2026-11-13T10:00:00Z",
    graded_at: latestGraded ? "2026-11-13T11:00:00Z" : null,
  };
  const attempts = [
    current,
    {
      ...current,
      version: 2,
      content: "PREVIOUS_UNGRADED",
      submitted_at: "2026-11-12T10:00:00Z",
    },
    {
      ...current,
      version: 1,
      content: "ORIGINAL_WORK",
      grade: "75",
      max_points: 100,
      feedback: "ORIGINAL_FEEDBACK",
      graded_at: "2026-11-11T12:00:00Z",
      submitted_at: "2026-11-11T10:00:00Z",
    },
  ];
  const post = {
    id: 5,
    type: "assignment",
    title: "A private assignment",
    body: "Instructions",
    student_id: postOwner,
    due_at: null,
    topic_id: null,
    max_points: maxPoints,
    created_at: "2026-11-11T10:00:00Z",
    updated_at: null,
  };
  const auth = {
    requireAdminPage: async () => {
      if (!authenticated) throw Error("UNAUTHORIZED");
    },
    requireStudent: async (id) => {
      if (!authenticated || id !== 1) throw Error("UNAUTHORIZED");
    },
  };
  const db = {
    queryOne: async (sql, args = []) => {
      queries.push({ sql, args });
      if (sql.includes("FROM students"))
        return { id: 1, name: "Test Student", active: 1 };
      if (sql.includes("FROM posts"))
        return sql.includes("AND student_id = ?") && args[1] === postOwner
          ? post
          : undefined;
      if (sql.includes("FROM submissions")) return current;
      throw Error("Unexpected query: " + sql);
    },
    queryAll: async (sql, args = []) => {
      queries.push({ sql, args });
      if (sql.includes("submission_versions")) return attempts;
      if (sql.includes("FROM post_comments")) return [
        {id:2,author_role:"student",author_student_id:1,body:"Student",student_name:"Alice",created_at:"2026-11-18",updated_at:"2026-11-18"},
        {id:1,author_role:"admin",author_student_id:null,body:"Tutor",student_name:null,created_at:"2026-11-18",updated_at:"2026-11-18"},
      ];
      return [];
    },
  };
  const cache = new Map();
  const leaf = (props) => React.createElement("div", null, props.children);
  function load(file) {
    const full = path.join(root, file);
    if (cache.has(full)) return cache.get(full).exports;
    const mod = new Module(full, module);
    mod.filename = full;
    mod.paths = Module._nodeModulePaths(root);
    cache.set(full, mod);
    const original = mod.require.bind(mod);
    mod.require = (name) => {
      if (name === "@/lib/db") return db;
      if (name === "@/lib/submitted-work") return { loadPostWork: async (studentId, postId) => {
        queries.push({ operation: "loadPostWork", args: [studentId, postId] });
        return studentId === postOwner && postId === post.id
          ? { post, attachments: [], submission: current, attempts, acceptsWork: true }
          : null;
      } };
      if (name === "next/server") return {NextResponse: Response};
      if (name === "@/lib/classroom-access") return {classroomAccess: async()=>({admin:viewerAdmin,studentId:viewerAdmin?null:1}),ClassroomAccessError:class extends Error{}};
      if (name === "@/components/attachment-preview") return load("components/attachment-preview.tsx");
      if (name === "@/components/post-comments") return { PostComments: leaf };
      if (name === "@/components/classroom/assignment-status")
        return load("components/classroom/assignment-status.tsx");
      if (name === "@/lib/attachment-url") return load("lib/attachment-url.ts");
      if (name === "@/components/rich-text")
        return load("components/rich-text.tsx");
      if (name === "@/lib/rich-text") return load("lib/rich-text.ts");
      if (name === "@/lib/auth") return auth;
      if (name === "next/navigation")
        return {
          notFound() {
            throw Error("NOT_FOUND");
          },
        };
      if (name === "next/link") return { __esModule: true, default: leaf };
      if (name === "lucide-react") return new Proxy({}, { get: () => leaf });
      if (name === "@/lib/format")
        return {
          fmtDateTime: (value) => value,
          fmtShortDate: (value) => value,
        };
      if (name === "@/lib/domain/validation")
        return load("lib/domain/validation.ts");
      if (name === "@/lib/action-errors" || name === "../action-errors")
        return load("lib/action-errors.ts");
      if (name === "@/components/classroom/submission-history")
        return load("components/classroom/submission-history.tsx");
      if (name === "@/components/classroom/grade-submission")
        return {
          SubmissionCard: (props) =>
            React.createElement(
              "div",
              { "data-latest-work": props.submission.version },
              props.submission.content,
            ),
          GradeSubmissionForm: (props) =>
            React.createElement("form", {
              "data-gradable-version": props.submission.version,
            }),
        };
      if (name === "@/components/classroom/submission-form")
        return {
          SubmissionForm: () =>
            React.createElement("form", { "data-new-attempt": true }),
        };
      if (name === "@/components/classroom-post-dialog")
        return { EditPostButton: leaf, DeletePostButton: leaf };
      if (name.startsWith("@/components/ui/"))
        return new Proxy({}, { get: () => leaf });
      return original(name);
    };
    mod._compile(
      ts.transpileModule(fs.readFileSync(full, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      full,
    );
    return mod.exports;
  }
  return { queries, load };
}
const studentRoute =
  "app/portal/student/[studentId]/classroom/post/[postId]/page.tsx";
const adminRoute = "app/classroom/[studentId]/post/[postId]/page.tsx";
const props = { params: Promise.resolve({ studentId: "1", postId: "5" }) };

test("student route denies a foreign post before reading its files or submission history", async () => {
  const f = fixture({ postOwner: 2 });
  await assert.rejects(f.load(studentRoute).default(props), /NOT_FOUND/);
  assert.deepEqual(f.queries.find(q => q.operation === "loadPostWork").args, [1,5]);
  assert(
    !f.queries.some(
      (q) =>
        q.sql?.includes("FROM post_attachments") ||
        q.sql?.includes("submission_versions"),
    ),
  );
});

test("student authentication occurs before database reads", async () => {
  const f = fixture({ authenticated: false });
  await assert.rejects(f.load(studentRoute).default(props), /UNAUTHORIZED/);
  assert.equal(f.queries.length, 0);
});

test("admin authentication occurs before database reads", async () => {
  const f = fixture({ authenticated: false });
  await assert.rejects(f.load(adminRoute).default(props), /UNAUTHORIZED/);
  assert.equal(f.queries.length, 0);
});

test("student sees latest pending work plus read-only original graded and superseded history", async () => {
  const f = fixture();
  const html = renderToStaticMarkup(await f.load(studentRoute).default(props));
  for (const text of [
    "LATEST_WORK",
    "ORIGINAL_WORK",
    "ORIGINAL_FEEDBACK",
    "75/100",
    "PREVIOUS_UNGRADED",
    "Awaiting grading",
    "Superseded before grading",
    "Submit a new attempt",
  ])
    assert(html.includes(text), text);
  assert(!html.includes("data-gradable-version"));
  assert.equal(
    f.queries.filter((q) => q.operation === "loadPostWork").length,
    1,
  );
});

test("admin grade control targets only latest version and old work remains visible as history", async () => {
  const f = fixture();
  const html = renderToStaticMarkup(await f.load(adminRoute).default(props));
  assert(html.includes('data-gradable-version="3"'));
  assert.equal((html.match(/data-gradable-version=/g) || []).length, 1);
  assert(html.includes("ORIGINAL_WORK"));
  assert(html.includes("ORIGINAL_FEEDBACK"));
  assert(html.includes("Superseded before grading"));
});

test("historical score keeps the original rubric maximum when current points change", async () => {
  const f = fixture({ maxPoints: 10 });
  const html = renderToStaticMarkup(await f.load(studentRoute).default(props));
  assert(html.includes("75/100"));
  assert(!html.includes("75/10<"));
});

test("student file-only submissions have a visible full-width submitted-work section separate from submit form", async () => {
  const f = fixture({ fileOnly: true });
  const page = await f
    .load("app/portal/student/[studentId]/classroom/post/[postId]/page.tsx")
    .default({ params: Promise.resolve({ studentId: "1", postId: "5" }) });
  const html = renderToStaticMarkup(page);
  assert.match(html, /Submitted attachment/);
  assert.match(html, /https:\/\/example.com\/attached-work.pdf/);
  assert.match(html, /Submitted work/);
  assert.match(html, /Submit a new attempt/);
  assert(!html.includes("classroom-assignment-layout"));
});

test("assignment status palette is consistent and avoids red for normal work states", () => {
  const f = fixture();
  const { AssignmentStatus } = f.load(
    "components/classroom/assignment-status.tsx",
  );
  for (const [status, color] of [
    ["Assigned", "blue"],
    ["Awaiting grading", "amber"],
    ["Turned in", "amber"],
    ["Graded", "emerald"],
    ["Missing", "slate"],
  ]) {
    const badge = AssignmentStatus({ status });
    assert(badge.props.className.includes(color));
    assert(!badge.props.className.includes("red-"));
  }
});

test("comment ownership is inverted for tutor and student chat viewers",async()=>{
  for(const viewerAdmin of [false,true]){
    const f=fixture({viewerAdmin});
    const route=f.load("app/api/classroom/posts/[postId]/comments/route.ts");
    const response=await route.GET(new Request("https://app.test/api/classroom/posts/5/comments"),{params:Promise.resolve({postId:"5"})});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.comments.find(c=>c.author_role==="admin").isOwn,viewerAdmin);
    assert.equal(data.comments.find(c=>c.author_role==="student").isOwn,!viewerAdmin);
    assert.equal(data.comments.find(c=>c.author_role==="student").canDelete,true);
    assert.equal(data.comments.find(c=>c.author_role==="admin").canEdit,viewerAdmin);
  }
});
test("image attachments are recognized from MIME or a recovered filename",()=>{
  const {imageAttachment}=fixture().load("components/attachment-preview.tsx");
  assert.equal(imageAttachment("Tutor_20261118_image.PNG","File"),true);
  assert.equal(imageAttachment("picture","image/png"),true);
  assert.equal(imageAttachment("worksheet.pdf","application/pdf"),false);
});

test("current grade display uses its recorded maximum while grade controls keep the current rubric", async () => {
  const student = fixture({maxPoints:200,latestGraded:true});
  const html = renderToStaticMarkup(await student.load(studentRoute).default(props));
  assert(html.includes("8/10"));
  assert(!html.includes("8/200"));
  const admin = fixture({maxPoints:200,latestGraded:true});
  const tutorHtml = renderToStaticMarkup(await admin.load(adminRoute).default(props));
  assert(tutorHtml.includes("/10"));
  assert(!tutorHtml.includes("/200"));
  assert(tutorHtml.includes('data-gradable-version="3"'));
});
