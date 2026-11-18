const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

// Actual application modules and real local SQLite. Only Next side effects and
// caller identities are stubbed; HTTP/session integration is covered separately.
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-business-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  let role = "admin",
    studentId = null;
  const cache = new Map();
  const auth = {
    verifyAdminSession: async () => role === "admin",
    getStudentSession: async () => (role === "student" ? studentId : null),
    createAdminSession: async () => {},
    destroyAdminSession: async () => {},
    createStudentSession: async () => {},
    destroyStudentSession: async () => {},
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
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/navigation")
        return {
          redirect(url) {
            throw new Error(`REDIRECT:${url}`);
          },
        };
      if (name === "./auth")
        return auth;
      if (name.startsWith(".")) {
        const resolved = path.resolve(path.dirname(filename), name) + ".ts";
        if (fs.existsSync(resolved)) return load(resolved);
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
    actions = load("lib/student-profile-actions.ts");
  return {
    db,
    actions,
    coldDb() {cache.delete(path.resolve(root,"lib/db.ts"));return load("lib/db.ts")},
    as(nextRole, sid = null) {
      role = nextRole;
      studentId = sid;
    },
    async seed() {
      await db.ensureMigrated();
      await db.execute(
        "INSERT INTO students(id,name,username,password,hourly_rate) VALUES (1,'Alice','alice','testpass',80),(2,'Bob','bob','testpass',80)",
      );
    },
    close() {
      db.getClient().close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
function form(values) {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value))
      value.forEach((item) => f.append(key, String(item)));
    else f.set(key, String(value));
  }
  return f;
}

test("student profile uses session identity, whitelists fields and persists own registered photo", async()=>{
 const f=fixture();try{await f.seed();f.as("student",1);
 await f.db.execute("INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type) VALUES('student_photo_0001','student',1,'me.png','image/png'),('student_photo_0002','student',2,'bob.png','image/png'),('student_doc_000001','student',1,'notes.txt','text/plain')");
 const result=await f.actions.updateStudentProfile(form({student_id:2,name:"New Alice",phone:"0123456789",email:"alice@example.com",profile_photo_url:"https://drive.google.com/file/d/student_photo_0001/view",hourly_rate:1,active:0,username:"hacked",guardian_name:"changed"}));
 assert.equal(result.success,true);
 const a=await f.db.queryOne("SELECT * FROM students WHERE id=1");assert.equal(a.name,"New Alice");assert.equal(a.profile_photo_url,"/api/files/student_photo_0001?inline=1");assert.equal(a.hourly_rate,80);assert.equal(a.active,1);assert.equal(a.username,"alice");assert.equal(a.guardian_name,null);
 assert.equal((await f.db.queryOne("SELECT name FROM students WHERE id=2")).name,"Bob");
 for(const photo of ["https://drive.google.com/file/d/student_photo_0002/view","https://drive.google.com/file/d/student_doc_000001/view","https://evil.test/x.png"]){const r=await f.actions.updateStudentProfile(form({name:"Should not commit",profile_photo_url:photo}));assert.equal(r.success,false)}
 assert.equal((await f.db.queryOne("SELECT name FROM students WHERE id=1")).name,"New Alice");
 assert.equal((await f.actions.updateStudentProfile(form({name:"New Alice",email:"bad",profile_photo_url:a.profile_photo_url}))).success,false);
 assert.equal((await f.actions.updateStudentProfile(form({name:"New Alice",profile_photo_url:""}))).success,true);assert.equal((await f.db.queryOne("SELECT profile_photo_url FROM students WHERE id=1")).profile_photo_url,null);
 }finally{f.close()}
});
test("profile edits reject admin-only, signed-out and deactivated student identities", async()=>{const f=fixture();try{await f.seed();for(const role of["admin","none"]){f.as(role);assert.equal((await f.actions.updateStudentProfile(form({name:"Intruder"}))).success,false)}f.as("student",1);await f.db.execute("UPDATE students SET active=0 WHERE id=1");assert.equal((await f.actions.updateStudentProfile(form({name:"Intruder"}))).success,false);assert.equal((await f.db.queryOne("SELECT name FROM students WHERE id=1")).name,"Alice")}finally{f.close()}});
test("v5 upgrade adds photo storage without resetting student history",async()=>{const f=fixture();try{await f.seed();await f.db.execute("UPDATE settings SET value='5' WHERE key='app_schema_version'");const before=(await f.db.queryOne("SELECT created_at FROM students WHERE id=1")).created_at; // Fresh loader simulates a new deployment process.
 await f.db.execute("ALTER TABLE students DROP COLUMN profile_photo_url");
 const cold=f.coldDb();try{await cold.ensureMigrated();assert.equal(cold.SCHEMA_VERSION,8);assert.equal((await cold.queryOne("SELECT value FROM settings WHERE key='app_schema_version'")).value,String(cold.SCHEMA_VERSION));assert.equal((await cold.queryOne("SELECT profile_photo_url FROM students WHERE id=1")).profile_photo_url,null);assert.equal((await cold.queryOne("SELECT created_at FROM students WHERE id=1")).created_at,before)}finally{cold.getClient().close()}

 }finally{f.close()}});
