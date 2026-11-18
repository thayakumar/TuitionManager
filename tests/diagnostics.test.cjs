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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-diagnostic-"));
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
      if (name === "server-only") return {};
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
    actions = load("lib/diagnostics.ts");
  return {
    db,
    actions,
    scoring:load("lib/diagnostic-scoring.ts"),
    bank:load("lib/diagnostic-bank.ts"),
    studentActions: load("lib/actions.ts"),
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
      await db.execute("INSERT INTO family_chat_rooms(student_id) SELECT id FROM students");
      await db.execute("INSERT INTO diagnostics(student_id) SELECT id FROM students");
      await db.execute("INSERT INTO share_tokens(student_id,token,active) VALUES(1,'parent-alice',1),(2,'parent-bob',1)");
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

// Synthetic questions only: the real uploaded answer key stays in the private database.
function template(){const items=[{code:'BG1',type:'choice',bm:'Pengalaman',en:'Experience',options:[{id:'X',bm:'Kerap',en:'Often'},{id:'Y',bm:'Jarang',en:'Rarely'}]},{code:'BG2',type:'likert',bm:'Yakin',en:'Confidence'},{code:'BG3',type:'likert',bm:'Minat',en:'Interest'}];for(let i=1;i<=8;i++)for(const strand of['CT','DR','AL','PR'])items.push({code:strand+i,strand,tier:i<=3?'asas':i<=6?'mid':'adv',type:i===3?'numeric':i===4?'text':i===5?'flowchart':'mcq',bm:'Soalan contoh '+strand+i,en:'Synthetic question '+strand+i,...(i===3?{correct:42}:i===4?{correct:['example','contoh']}:{options:[{id:'X',bm:'Pilihan X',en:'Choice X'},{id:'Y',bm:'Pilihan Y',en:'Choice Y'}],correct:'Y'}),tip_bm:'Bina asas',tip_en:'Build foundations'});return{version:'ask-readiness-v3',items}}
function correctWork(bank){return Object.fromEntries(bank.items.map(q=>[q.code,{value:q.code==='BG1'?'X':q.type==='likert'?3:Array.isArray(q.correct)?q.correct[0]:q.correct,ms:1000}]))}
const admin={viewer:'admin'},student={viewer:'student'};
async function configure(f){await f.actions.importDiagnosticTemplate(template(),admin)}
async function opened(f,sid=1){f.as('admin');let v=await f.actions.readDiagnostic(sid,admin);v=await f.actions.mutateDiagnostic(sid,{action:'open',revision:v.diagnostic.revision},admin);f.as('student',sid);return f.actions.mutateDiagnostic(sid,{action:'start',revision:v.diagnostic.revision},student)}
test('accounts initialize one awaiting diagnostic; private template is immutable and never required for student creation',async()=>{const f=fixture();try{await f.seed();const sid=await f.studentActions.createStudentQuick(form({name:'New Student',hourly_rate:80}));assert.equal((await f.db.queryOne('SELECT status FROM diagnostics WHERE student_id=?',[sid])).status,'awaiting');assert.equal((await f.actions.readDiagnostic(sid,admin)).configured,false);await assert.rejects(f.actions.mutateDiagnostic(sid,{action:'open',revision:0},admin),e=>e.status===503);await configure(f);assert.equal((await f.actions.importDiagnosticTemplate(template(),admin)).alreadyConfigured,true);const changed=template();changed.items[3].correct='X';await assert.rejects(f.actions.importDiagnosticTemplate(changed,admin),e=>e.status===409);f.as('student',1);const view=await f.actions.readDiagnostic(1,student);assert.deepEqual(view.questions,[]);assert.equal(view.diagnostic.answers,undefined);await assert.rejects(f.actions.importDiagnosticTemplate(template(),student),e=>e.status===403)}finally{f.close()}});
test('one attempt saves and submits, tutor reviews, locks and exposes only frozen results to its owner',async()=>{const f=fixture();try{await f.seed();await configure(f);let v=await opened(f);assert.equal(v.questions.length,35);assert(!JSON.stringify(v.questions).includes('correct'));const answers=correctWork(template());v=await f.actions.mutateDiagnostic(1,{action:'save',revision:v.diagnostic.revision,answers,requestId:'saved-work-0001'},student);v=await f.actions.mutateDiagnostic(1,{action:'submit',revision:v.diagnostic.revision,answers,requestId:'submit-work-0001'},student);assert.equal(v.diagnostic.status,'submitted');assert.equal(v.diagnostic.report,undefined);assert.equal(v.diagnostic.answers,undefined);assert.deepEqual(v.questions,[]);await assert.rejects(f.actions.mutateDiagnostic(1,{action:'start',revision:v.diagnostic.revision},student),e=>e.status===409);f.as('admin');const tutor=await f.actions.readDiagnostic(1,admin);assert.equal(tutor.diagnostic.report.totalCorrect,32);assert.equal(tutor.diagnostic.report.overallPct,100);assert.equal(tutor.diagnostic.report.qlog.length,35);v=await f.actions.mutateDiagnostic(1,{action:'lock',revision:tutor.diagnostic.revision},admin);const frozen=JSON.stringify(v.diagnostic.report);await f.db.execute('DELETE FROM diagnostic_templates');f.as('student',1);v=await f.actions.readDiagnostic(1,student);assert.equal(JSON.stringify(v.diagnostic.report),frozen);assert.deepEqual(v.questions,[]);await assert.rejects(f.actions.mutateDiagnostic(1,{action:'save',revision:v.diagnostic.revision,answers:{},requestId:'retry-after-lock'},student),e=>e.status===409);f.as('admin');await assert.rejects(f.actions.mutateDiagnostic(1,{action:'open',revision:v.diagnostic.revision},admin),e=>e.status===409);assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type='diagnostic_locked'")).n,1)}finally{f.close()}});
test('revision and request replay protect drafts, locks and concurrent tabs without duplicate notices',async()=>{const f=fixture();try{await f.seed();await configure(f);let v=await opened(f);const revision=v.diagnostic.revision,answers={CT1:{value:'Y',ms:1000}};const request={action:'save',revision,answers,requestId:'same-retry-save'};v=await f.actions.mutateDiagnostic(1,request,student);const retry=await f.actions.mutateDiagnostic(1,request,student);assert.equal(retry.diagnostic.revision,v.diagnostic.revision);await assert.rejects(f.actions.mutateDiagnostic(1,{...request,answers:{}},student),e=>e.status===409);await assert.rejects(f.actions.mutateDiagnostic(1,{action:'save',revision,answers:{},requestId:'other-tab-save'},student),e=>e.status===409);f.as('admin');const locked=await f.actions.mutateDiagnostic(1,{action:'lock',revision:v.diagnostic.revision},admin);assert.equal(locked.diagnostic.report.totalCorrect,1);assert.equal(locked.diagnostic.report.skippedCount,31);f.as('student',1);const stale=await f.actions.mutateDiagnostic(1,request,student);assert.equal(stale.diagnostic.status,'locked');assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM diagnostic_requests WHERE request_id=?',['same-retry-save'])).n,1)}finally{f.close()}});
test('students cannot cross accounts, forge grades, act as tutor, or keep access after deactivation',async()=>{const f=fixture();try{await f.seed();await configure(f);let v=await opened(f);await assert.rejects(f.actions.readDiagnostic(2,student),e=>e.status===404);await assert.rejects(f.actions.mutateDiagnostic(1,{action:'lock',revision:v.diagnostic.revision},student),e=>e.status===403);await assert.rejects(f.actions.diagnosticOverview(student),e=>e.status===403);v=await f.actions.mutateDiagnostic(1,{action:'submit',revision:v.diagnostic.revision,answers:{CT1:{value:'X',ms:1,status:'correct'}},requestId:'tampered-scoring'},student);f.as('admin');assert.equal((await f.actions.readDiagnostic(1,admin)).diagnostic.report.totalCorrect,0);f.as('student',1);await f.db.execute('UPDATE students SET active=0 WHERE id=1');await assert.rejects(f.actions.readDiagnostic(1,student),e=>e.status===401);f.as('none');await assert.rejects(f.actions.readDiagnostic(1,admin),e=>e.status===401)}finally{f.close()}});
test('scores use 32 skills only, strict numeric parsing, all strands and skipped rows, with bounded optional timing',()=>{const f=fixture();try{const bank=f.bank.validateDiagnosticBank(template());const all=f.scoring.computeDiagnosticReport(correctWork(bank),bank);assert.equal(all.overallPct,100);assert.equal(all.totalCorrect,32);for(const s of['CT','DR','AL','PR'])assert.equal(all.strandScores[s].total,8);const none=f.scoring.computeDiagnosticReport({},bank);assert.equal(none.overallPct,0);assert.equal(none.skippedCount,32);assert.equal(none.qlog.length,35);assert.equal(none.timingAvailable,false);assert.equal(f.scoring.checkDiagnosticAnswer(bank.items.find(q=>q.type==='numeric'),'42abc'),false);assert.equal(f.scoring.checkDiagnosticAnswer(bank.items.find(q=>q.type==='numeric'),'42.0'),true);assert.equal(f.scoring.checkDiagnosticAnswer(bank.items.find(q=>q.type==='text'),' EXAMPLE '),true);assert.throws(()=>f.scoring.normalizeDiagnosticAnswers({UNKNOWN:{value:1,ms:1}},bank.items));assert.throws(()=>f.scoring.normalizeDiagnosticAnswers({BG2:{value:9,ms:1}},bank.items));assert.equal(f.scoring.normalizeDiagnosticAnswers({BG2:{value:3,ms:9999999}},bank.items).BG2.ms,3600000);assert.deepEqual([39,40,59,60,79,80].map(n=>f.scoring.diagnosticBand(n).key),['not-ready','emerging','emerging','ready','ready','strong'])}finally{f.close()}});

test('retrying an acknowledged old save cannot label a conflicting newer tab draft as saved',async()=>{const f=fixture();try{await f.seed();await configure(f);let v=await opened(f);const old={action:'save',revision:v.diagnostic.revision,answers:{CT1:{value:'Y',ms:1}},requestId:'first-tab-save'};v=await f.actions.mutateDiagnostic(1,old,student);v=await f.actions.mutateDiagnostic(1,{action:'save',revision:v.diagnostic.revision,answers:{CT1:{value:'X',ms:1}},requestId:'second-tab-save'},student);await assert.rejects(f.actions.mutateDiagnostic(1,old,student),e=>e.status===409&&e.code==='STALE_REVISION');assert.equal((await f.actions.readDiagnostic(1,student)).diagnostic.answers.CT1.value,'X')}finally{f.close()}});
