const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  Module = require("module"),
  ts = require("typescript"),
  React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
function load(file, stubs = {}) {
  const filename = path.join(root, file),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(root);
  const original = m.require.bind(m);
  m.require = (name) =>
    Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}
test("parent attendance and schedule enforce elapsed/upcoming roles with isolated real SQL", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-parent-time-"));
  process.env.TURSO_DATABASE_URL = "file:" + path.join(dir, "test.db");
  delete process.env.TURSO_AUTH_TOKEN;
  const db = load("lib/db.ts");
  try {
    await db.ensureMigrated();
    await db.execute(
      "INSERT INTO students(id,name) VALUES(1,'Alice'),(2,'Other')",
    );
    await db.execute(
      "INSERT INTO classes(student_id,scheduled_at,duration_minutes,status,attendance,subject) VALUES(1,'2000-01-01T01:00:00Z',60,'completed','present','Past present'),(1,'2000-01-02T01:00:00Z',60,'completed','absent','Past absent'),(1,'2000-01-03T01:00:00Z',60,'canceled',NULL,'Past canceled'),(1,'2099-01-01T01:00:00Z',60,'scheduled',NULL,'Future scheduled'),(1,'2099-01-02T01:00:00Z',60,'completed','present','Future present'),(1,'2099-01-03T01:00:00Z',60,'completed','absent','Future absent'),(2,'2000-01-01T01:00:00Z',60,'completed','present','Private other')",
    );
    const Pass = ({ children }) => React.createElement("div", null, children),
      stubs = {
        "@/lib/db": db,
        "@/lib/format": load("lib/format.ts"),
        "@/lib/lesson-status": load("lib/lesson-status.ts"),
        "@/lib/portal-context": {
          requireParent: async (token) => {
            assert.equal(token, "own-link");
            return { id: 1, name: "Alice", subject: "Math" };
          },
          PUBLIC_LESSON_COLUMNS:
            "id,student_id,scheduled_at,duration_minutes,status,attendance,subject,location,is_trial,cancel_reason",
          normalizedAttendance: (a) => (a === "late" ? "present" : a),
          attendanceSummary: (present, absent) => ({
            present,
            absent,
            rate:
              present + absent
                ? Math.round((present / (present + absent)) * 100)
                : 0,
          }),
        },
        "@/components/page-header": {
          PageHeader: ({ title, subtitle }) =>
            React.createElement("header", null, title, subtitle),
        },
        "@/components/ui/card": {
          Card: Pass,
          CardHeader: Pass,
          CardContent: Pass,
          CardTitle: Pass,
        },
        "@/components/ui/badge": { Badge: Pass },
        "@/components/lesson-status-badge": {
          LessonStatusBadge: ({ status }) =>
            React.createElement("span", null, status),
        },
      };
    const attendance = load(
      "app/share/[token]/attendance/page.tsx",
      stubs,
    ).default;
    const schedule = load("app/share/[token]/schedule/page.tsx", stubs).default;
    const a = renderToStaticMarkup(
        await attendance({ params: Promise.resolve({ token: "own-link" }) }),
      ),
      s = renderToStaticMarkup(
        await schedule({ params: Promise.resolve({ token: "own-link" }) }),
      );
    const attendanceText=a.replace(/<[^>]*>/g," ");
    const scheduleText=s.replace(/<[^>]*>/g," ");
    assert(attendanceText.includes("2000"));
    assert(!attendanceText.includes("2099"));
    assert(a.includes("50%"));
    assert(!a.includes("Private other"));
    assert(scheduleText.includes("2099"));
    assert(!scheduleText.includes("2000"));
    assert(s.includes("Future scheduled"));
    assert(!s.includes("Future present"));
    assert(!s.includes("Future absent"));
    assert(!s.includes("Past Classes"));
  } finally {
    db.getClient().close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
