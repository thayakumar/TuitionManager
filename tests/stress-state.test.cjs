const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const {AsyncLocalStorage}=require('node:async_hooks');
const root = path.resolve(__dirname, "..");

// Actual application modules and real local SQLite. Only Next side effects and
// caller identities are stubbed; HTTP/session integration is covered separately.
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-state-stress-"));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  let role = "admin",
    studentId = null;
  const cache = new Map();
  const identity=new AsyncLocalStorage();
  const auth = {
    verifyAdminSession: async () => (identity.getStore()?.role??role) === "admin",
    getStudentSession: async () => {const actor=identity.getStore()??{role,studentId};return actor.role === "student" ? actor.studentId : null},
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
    chat:load("lib/family-chat.ts"),
    boards:load("lib/whiteboards.ts"),
    run(nextRole,sid,operation){return identity.run({role:nextRole,studentId:sid},operation)},
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
test('100 simultaneous diagnostic saves permit one revision winner and no false-grade mutations',async()=>{const f=fixture();try{await f.seed();await configure(f);const view=await opened(f),revision=view.diagnostic.revision;const runs=await Promise.allSettled(Array.from({length:100},(_,i)=>f.run('student',1,()=>f.actions.mutateDiagnostic(1,{action:'save',revision,answers:{CT1:{value:i%2?'X':'Y',ms:i}},requestId:'parallel-save-'+i},student))));assert.equal(runs.filter(r=>r.status==='fulfilled').length,1);assert(runs.filter(r=>r.status==='rejected').every(r=>r.reason.status===409));const current=await f.actions.readDiagnostic(1,student);assert.equal(current.diagnostic.revision,revision+1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM diagnostic_requests')).n,1);assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type='diagnostic_submitted'")).n,0)}finally{f.close()}});
test('simultaneous diagnostic lock and save finalize one consistent snapshot with stale work rejected',async()=>{const f=fixture();try{await f.seed();await configure(f);let view=await opened(f);const revision=view.diagnostic.revision;const results=await Promise.allSettled([f.run('admin',null,()=>f.actions.mutateDiagnostic(1,{action:'lock',revision,requestId:'parallel-lock'},admin)),f.run('student',1,()=>f.actions.mutateDiagnostic(1,{action:'save',revision,answers:{CT1:{value:'Y',ms:1}},requestId:'parallel-saved'},student))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);f.as('admin');view=await f.actions.readDiagnostic(1,admin);if(view.diagnostic.status!=='locked')view=await f.actions.mutateDiagnostic(1,{action:'lock',revision:view.diagnostic.revision},admin);const frozen=view.diagnostic.report;assert.equal(frozen.totalCorrect,view.diagnostic.answers.CT1?.value==='Y'?1:0);const rejected=await Promise.allSettled(Array.from({length:25},(_,i)=>f.run('student',1,()=>f.actions.mutateDiagnostic(1,{action:'save',revision:view.diagnostic.revision,answers:{},requestId:'post-lock-'+i},student))));assert(rejected.every(r=>r.status==='rejected'&&r.reason.status===409));assert.deepEqual((await f.actions.readDiagnostic(1,admin)).diagnostic.report,frozen);assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM notifications WHERE type='diagnostic_locked'")).n,1)}finally{f.close()}});
test('200 duplicate chat sends and 100 separate sends remain atomic, scoped and replay-safe',async()=>{const f=fixture();try{await f.seed();const duplicate={action:'send',body:'One acknowledgement',clientId:'duplicate-200-chat'};const duplicateResults=await Promise.all(Array.from({length:200},()=>f.run('student',1,()=>f.chat.mutateChat(1,duplicate,student))));assert.equal(new Set(duplicateResults.map(r=>r.id)).size,1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_messages')).n,1);await Promise.all(Array.from({length:100},(_,i)=>f.run('admin',null,()=>f.chat.mutateChat(i%2?1:2,{action:'send',body:'Bulk '+i,clientId:'stress-bulk-'+i},admin))));assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_messages')).n,101);f.as('student',1);const room1=await f.chat.chatMessages(1,student);assert(room1.messages.every(m=>!m.body.includes('Bulk ')||Number(m.body.split(' ')[1])%2===1));await assert.rejects(f.chat.chatMessages(2,student),e=>e.status===404);const cross=await f.db.queryOne('SELECT m.id FROM family_chat_messages m JOIN family_chat_rooms r ON r.id=m.room_id WHERE r.student_id=2 LIMIT 1');assert(!(await f.chat.chatMessages(1,student,{refreshIds:[Number(cross.id)]})).messages.some(m=>m.id===cross.id))}finally{f.close()}});
test('revoked parent and newly deactivated student are rechecked inside chat and diagnostic writes',async()=>{const f=fixture();try{await f.seed();await configure(f);const started=await opened(f);f.as('none');const original=f.db.queryOne;let revoked=false;f.db.queryOne=async(sql,args)=>{const row=await original(sql,args);if(!revoked&&sql.includes('SELECT student_id FROM share_tokens')){revoked=true;await f.db.execute("UPDATE share_tokens SET active=0 WHERE token='parent-alice'")}return row};await assert.rejects(f.chat.mutateChat(1,{action:'send',body:'Cannot race revocation',clientId:'revoked-parent-race'},{viewer:'parent',parentToken:'parent-alice'}),e=>e.status===401);assert.equal((await original('SELECT COUNT(*) n FROM family_chat_messages')).n,0);let deactivated=false;f.db.queryOne=async(sql,args)=>{const row=await original(sql,args);if(!deactivated&&sql==='SELECT id FROM students WHERE id=? AND active=1'){deactivated=true;await f.db.execute('UPDATE students SET active=0 WHERE id=1')}return row};f.as('student',1);await assert.rejects(f.actions.mutateDiagnostic(1,{action:'save',revision:started.diagnostic.revision,answers:{CT1:{value:'Y',ms:1}},requestId:'deactivate-race-save'},student),e=>e.status===404);assert.equal((await original('SELECT revision FROM diagnostics WHERE student_id=1')).revision,started.diagnostic.revision)}finally{f.close()}});
test('100 concurrent whiteboard writers produce one revision and cannot cross student rooms',async()=>{const f=fixture();try{await f.seed();await f.db.execute("INSERT INTO classes(id,student_id,scheduled_at) VALUES(1,1,'2026-11-20T01:00:00.000Z'),(2,2,'2026-11-20T03:00:00.000Z')");const results=await Promise.allSettled(Array.from({length:100},(_,i)=>f.run('student',1,()=>f.boards.writeWhiteboard('class-1',{elements:[{id:'item-'+i}]},0))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert(results.filter(r=>r.status==='rejected').every(r=>r.reason.status===409&&r.reason.current.revision===1));f.as('student',2);await assert.rejects(f.boards.readWhiteboard('class-1',1),e=>e.status===404);await assert.rejects(f.boards.writeWhiteboard('class-1',{elements:[]},1),e=>e.status===404);f.as('student',1);const saved=await f.boards.readWhiteboard('class-1');assert.equal(saved.revision,1);assert.equal((await f.boards.readWhiteboard('class-1',1)).data,null);await f.db.execute('UPDATE students SET active=0 WHERE id=1');await assert.rejects(f.boards.writeWhiteboard('class-1',{elements:[]},1),e=>e.status===404);assert.equal((await f.db.queryOne('SELECT revision FROM whiteboards WHERE class_id=1')).revision,1)}finally{f.close()}});
test('oversized, malformed and unauthorized state changes do not leave partial records',async()=>{const f=fixture();try{await f.seed();await configure(f);const start=await opened(f);const prior=await f.db.queryOne('SELECT answers,revision FROM diagnostics WHERE student_id=1');for(const answers of[{UNKNOWN:{value:1,ms:1}},{BG2:{value:6,ms:1}},{CT1:{value:'foreign-choice',ms:1}},{CT1:{value:'Y',ms:-1}}])await assert.rejects(f.actions.mutateDiagnostic(1,{action:'save',revision:start.diagnostic.revision,answers,requestId:'invalid-'+Math.random().toString().slice(2)},student),e=>e.status===400);assert.deepEqual(await f.db.queryOne('SELECT answers,revision FROM diagnostics WHERE student_id=1'),prior);f.as('admin');await f.db.execute("INSERT INTO classes(id,student_id,scheduled_at)VALUES(1,1,'2026-11-20T01:00:00Z')");await assert.rejects(f.boards.writeWhiteboard('class-1',{text:'😀'.repeat(300000)},0),e=>e.status===413);const cyclic={};cyclic.self=cyclic;await assert.rejects(f.boards.writeWhiteboard('class-1',cyclic,0),e=>e.status===400);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM whiteboards')).n,0);await assert.rejects(f.chat.mutateChat(1,{action:'send',body:'Should rollback',clientId:'bad-attachment-send',attachments:[{fileUrl:'/api/files/unknownfile000001'}]},admin),e=>e.status===403);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_messages')).n,0)}finally{f.close()}});
