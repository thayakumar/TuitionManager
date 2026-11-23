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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-stress-business-"));
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
      if (filename === path.join(root, "lib/actions.ts") && name === "./auth")
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
    actions = load("lib/actions.ts");
  return {
    db,
    actions,
    load,
    dir,
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
async function insertLesson(f, options = {}) {
  const {
    sid = 1,
    at = "2026-10-10T02:00:00Z",
    status = "completed",
    attendance = "present",
    trial = 0,
    recurrence = null,
  } = options;
  const r = await f.db.execute(
    "INSERT INTO classes(student_id,scheduled_at,duration_minutes,status,attendance,is_trial,recurrence_id,meeting_room,subject) VALUES(?,?,60,?,?,?,?,?,?)",
    [
      sid,
      at,
      status,
      attendance,
      trial,
      recurrence,
      "TestRoom",
      "SUBJECT_MUST_NOT_APPEAR",
    ],
  );
  return Number(r.lastInsertRowid);
}

async function noticeCount(f,type){return Number((await f.db.queryOne('SELECT COUNT(*) n FROM notifications WHERE type=?',[type])).n)}
test('replayed identical profile save emits no extra student notification',async()=>{const f=fixture();try{await f.seed();const data=form({name:'Alice',hourly_rate:80,active:'on'});await f.actions.updateStudentQuick(1,data);const n=await noticeCount(f,'profile_updated');await Promise.all(Array.from({length:12},()=>f.actions.updateStudentQuick(1,data)));assert.equal(await noticeCount(f,'profile_updated'),n)}finally{f.close()}});
test('identical class detail saves do not produce new notifications',async()=>{const f=fixture();try{await f.seed();const cid=await f.actions.createClassQuick(form({student_id:1,scheduled_at:'2028-05-01T09:00',duration_minutes:60}));const data=form({scheduled_at:'2028-05-01T09:00',duration_minutes:60,status:'scheduled'});const run=()=>assert.rejects(f.actions.updateClass(cid,data),/REDIRECT:/);await run();const n=await noticeCount(f,'class_updated');for(let i=0;i<8;i++)await run();assert.equal(await noticeCount(f,'class_updated'),n)}finally{f.close()}});
test('replayed cancellation and identical report are silent but a real edit notifies',async()=>{const f=fixture();try{await f.seed();const cid=await f.actions.createClassQuick(form({student_id:1,scheduled_at:'2028-05-02T09:00',duration_minutes:60}));await f.actions.cancelClass(cid,form({cancel_reason:'Informed early'}));const cancels=await noticeCount(f,'class_cancelled');for(let i=0;i<8;i++)await f.actions.cancelClass(cid,form({cancel_reason:'Informed early'}));assert.equal(await noticeCount(f,'class_cancelled'),cancels);const done=await insertLesson(f);await f.actions.saveReport(done,form({topics_covered:'Linear algebra',rating:4}));const reports=await noticeCount(f,'report_updated');for(let i=0;i<8;i++)await f.actions.saveReport(done,form({topics_covered:'Linear algebra',rating:4}));assert.equal(await noticeCount(f,'report_updated'),reports);await f.actions.saveReport(done,form({topics_covered:'Quadratic equations',rating:5}));assert.equal(await noticeCount(f,'report_updated'),reports+1)}finally{f.close()}});
test('maximum-absent legacy work still rejects nonnumeric, negative or infinite grades',async()=>{const f=fixture();try{await f.seed();await f.db.execute("INSERT INTO posts(id,student_id,type,title,max_points)VALUES(1,1,'assignment','Legacy work',NULL)");f.as('student',1);await f.actions.submitAssignment(form({post_id:1,content:'My work'}));const sub=await f.db.queryOne('SELECT id,version FROM submissions');f.as('admin');for(const grade of ['A','-1','Infinity','NaN'])await assert.rejects(f.actions.gradeSubmissionAction(sub.id,grade,'',1,sub.version),/Grade/);await f.actions.gradeSubmissionAction(sub.id,'82','Reviewed',1,sub.version);assert.equal((await f.db.queryOne('SELECT grade FROM submissions')).grade,'82')}finally{f.close()}});
test('100 overlapping creates and 40 invoice/cron races preserve single-tutor and billing invariants',async()=>{const f=fixture();try{await f.seed();const results=await Promise.allSettled(Array.from({length:100},(_,i)=>f.actions.createClassQuick(form({student_id:i%2+1,scheduled_at:'2028-06-01T10:00',duration_minutes:60}))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM classes')).n,1);for(let i=0;i<20;i++)await insertLesson(f,{sid:i%2+1,at:`2028-06-${String(i+1).padStart(2,'0')}T03:00:00Z`,trial:i%5===0?1:0,attendance:i%7===0?'absent':'present'});const monthly=f.load('lib/monthly-invoices.ts');const bills=await Promise.allSettled(Array.from({length:40},(_,i)=>i%2?monthly.generateMonthlyDrafts('2028-06'):f.actions.generateInvoiceQuick(form({student_id:i%4<2?1:2,period_start:'2028-06-01',period_end:'2028-06-30'}))));assert(bills.some(r=>r.status==='fulfilled'));assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM (SELECT class_id FROM invoice_items GROUP BY class_id HAVING COUNT(*)>1)')).n,0);assert.equal((await f.db.queryOne("SELECT COUNT(*) n FROM invoice_items ii JOIN classes c ON c.id=ii.class_id WHERE c.attendance='absent' OR c.status='canceled' ")).n,0);for(const inv of await f.db.queryAll('SELECT id,total_amount FROM invoices'))assert.equal(inv.total_amount,(await f.db.queryOne('SELECT SUM(amount) n FROM invoice_items WHERE invoice_id=?',[inv.id])).n)}finally{f.close()}});
test('100 duplicate submissions keep one attempt and stale grades never overwrite newer work',async()=>{const f=fixture();try{await f.seed();await f.db.execute("INSERT INTO posts(id,student_id,type,title,max_points)VALUES(1,1,'assignment','Stress work',100)");f.as('student',1);await Promise.all(Array.from({length:100},()=>f.actions.submitAssignment(form({post_id:1,content:'Identical answer'}))));assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM submissions')).n,1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM submission_versions')).n,1);const first=await f.db.queryOne('SELECT id,version FROM submissions');f.as('admin');await f.actions.gradeSubmissionAction(first.id,'60','First feedback',1,1);f.as('student',1);await Promise.all(Array.from({length:40},()=>f.actions.submitAssignment(form({post_id:1,content:'Second answer'}))));f.as('admin');await assert.rejects(f.actions.gradeSubmissionAction(first.id,'99','Stale',1,1),/Newer work/);assert.deepEqual((await f.db.queryAll('SELECT version,grade FROM submission_versions ORDER BY version')).map(r=>[r.version,r.grade]),[[1,'60'],[2,null]])}finally{f.close()}});

test('independent Node processes cannot double-book or double-claim a lesson',async()=>{const f=fixture();try{await f.seed();const worker=path.join(f.dir,'stress-worker.cjs');fs.writeFileSync(worker,`
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require(${JSON.stringify(require.resolve('typescript'))});
const root=${JSON.stringify(root)},cache=new Map();
function load(relative){const filename=path.resolve(root,relative);if(cache.has(filename))return cache.get(filename).exports;const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(root);cache.set(filename,m);const original=m.require.bind(m);m.require=name=>{if(name==='next/cache')return{revalidatePath(){}};if(name==='next/navigation')return{redirect(url){throw Error('REDIRECT:'+url)}};if(name==='./auth')return{verifyAdminSession:async()=>true,getStudentSession:async()=>null};if(name.startsWith('.')){const p=path.resolve(path.dirname(filename),name)+'.ts';if(fs.existsSync(p))return load(p)}return original(name)};m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports}
(async()=>{const db=load('lib/db.ts'),actions=load('lib/actions.ts');await db.ensureMigrated();await new Promise(r=>setTimeout(r,Math.max(0,Number(process.env.STRESS_START)-Date.now())));const form=new FormData();const values=process.env.STRESS_OP==='class'?{student_id:1,scheduled_at:'2028-08-01T10:00',duration_minutes:60}:{student_id:1,period_start:'2028-08-01',period_end:'2028-08-31'};for(const[k,v]of Object.entries(values))form.set(k,String(v));try{if(process.env.STRESS_OP==='class')await actions.createClassQuick(form);else if(process.env.STRESS_OP==='cron')await load('lib/monthly-invoices.ts').generateMonthlyDrafts('2028-08');else await actions.generateInvoiceQuick(form);process.stdout.write(JSON.stringify({ok:true}))}catch(e){process.stdout.write(JSON.stringify({ok:false,error:String(e.message)}))}finally{db.getClient().close()}})().catch(e=>{process.stdout.write(JSON.stringify({ok:false,error:String(e.message)}));process.exitCode=1});`);
 const {spawn}=require('node:child_process');async function run(op,start){return new Promise((resolve,reject)=>{let out='',err='';const child=spawn(process.execPath,[worker],{env:{...process.env,STRESS_OP:op,STRESS_START:String(start)}});child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',()=>{try{resolve(JSON.parse(out))}catch{reject(Error('Worker failed: '+err))}})})}
 let results=await Promise.all([run('class',Date.now()+1000),run('class',Date.now()+1000)]);assert.equal(results.filter(x=>x.ok).length,1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM classes')).n,1);await insertLesson(f,{at:'2028-08-02T03:00:00Z'});results=await Promise.all([run('invoice',Date.now()+1000),run('cron',Date.now()+1000)]);assert(results.some(x=>x.ok));assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoice_items')).n,1);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoices')).n,1);
}finally{f.close()}});

test('deactivation after authentication blocks queued student note and reschedule writes', async () => {
  const f = fixture();
  try {
    await f.seed();
    const cid = await insertLesson(f, { at: '2035-06-01T02:00:00Z', status: 'scheduled', attendance: null });
    f.as('student', 1);
    const transaction = f.db.withTransaction;
    // Authentication already returned the student id. Deactivation commits
    // before the requested write obtains its transaction, as with a queued save.
    f.db.withTransaction = async (operation) => {
      await f.db.execute('UPDATE students SET active=0 WHERE id=1');
      return transaction(operation);
    };
    await assert.rejects(f.actions.saveStudentNotes(cid, 'Do not persist this queued note'), /inactive/);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM class_notes')).n, 0);
    await f.db.execute('UPDATE students SET active=1 WHERE id=1');
    const result = await f.actions.createRescheduleRequest(form({
      student_id: 1,
      class_id: cid,
      reason: 'Queued before deactivation',
      preferred_time_1: '2035-06-02T10:00',
    }));
    assert.match(result.error, /inactive/);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM reschedule_requests')).n, 0);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM notifications')).n, 0);
  } finally {
    f.close();
  }
});
