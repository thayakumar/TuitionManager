const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const root = path.resolve(__dirname,'..');
function loader(stubs={}) {const cache=new Map();return function load(file){const full=path.join(root,file);if(cache.has(full))return cache.get(full).exports;const m=new Module(full,module);m.filename=full;m.paths=Module._nodeModulePaths(root);cache.set(full,m);const original=m.require.bind(m);m.require=name=>{if(Object.hasOwn(stubs,name))return stubs[name];if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(full),name))+'.ts');return original(name)};m._compile(ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,full);return m.exports}}
async function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuition-monthly-'));process.env.TURSO_DATABASE_URL='file:'+path.join(dir,'billing.db');delete process.env.TURSO_AUTH_TOKEN;const load=loader(), db=load('lib/db.ts');await db.migrate();await db.execute("INSERT INTO students(id,name,hourly_rate,active) VALUES(1,'A',80,1),(2,'B',65.55,0),(3,'No lessons',90,1),(4,'Trial only',80,1),(5,'Zero rate',0,1)");return{db,monthly:load('lib/monthly-invoices.ts'),writer:load('lib/invoice-generation.ts'),async close(){db.getClient().close();fs.rmSync(dir,{recursive:true,force:true})}}}
async function lesson(f,id,student,time,{status='completed',attendance='present',trial=0,minutes=60}={}){await f.db.execute('INSERT INTO classes(id,student_id,scheduled_at,duration_minutes,status,attendance,is_trial) VALUES(?,?,?,?,?,?,?)',[id,student,time,minutes,status,attendance,trial])}
test('monthly billing window uses Malaysia last day including leap/year boundaries and delayed delivery',()=>{const {dueInvoiceMonth}=loader()('lib/monthly-invoices.ts');for(const [iso,want] of [['2026-11-30T15:59:00Z','2026-11'],['2026-11-30T16:48:00Z','2026-11'],['2026-11-30T17:00:00Z',null],['2026-11-30T15:58:59Z',null],['2026-11-29T15:59:00Z',null],['2024-02-29T15:59:00Z','2024-02'],['2024-02-28T15:59:00Z',null],['2026-12-31T16:05:00Z','2026-12']])assert.equal(dueInvoiceMonth(new Date(iso)),want,iso)});
test('automatic drafts include only attended unclaimed month lessons, preserve trial, skip RM0 and remain private drafts',async()=>{const f=await fixture();try{await lesson(f,1,1,'2026-10-31T15:59:00Z');await lesson(f,2,1,'2026-10-31T16:00:00Z');await lesson(f,3,1,'2026-11-30T15:59:00Z',{minutes:90});await lesson(f,4,1,'2026-11-30T16:00:00Z');await lesson(f,5,1,'2026-11-12T05:00:00Z',{attendance:'absent'});await lesson(f,6,1,'2026-11-13T05:00:00Z',{status:'canceled',attendance:null});await lesson(f,7,1,'2026-11-14T05:00:00Z',{status:'scheduled',attendance:null});await lesson(f,8,1,'2026-11-15T05:00:00Z',{trial:1});await lesson(f,9,2,'2026-11-20T05:00:00Z',{attendance:'late',minutes:90});await lesson(f,10,4,'2026-11-21T05:00:00Z',{trial:1});await lesson(f,11,5,'2026-11-21T05:00:00Z');const result=await f.monthly.generateMonthlyDrafts('2026-11');assert.equal(result.created,2);const invoices=await f.db.queryAll('SELECT * FROM invoices ORDER BY student_id');assert.deepEqual(invoices.map(x=>[x.student_id,x.total_amount,x.status,x.billing_month]),[[1,200,'draft','2026-11'],[2,98.33,'draft','2026-11']]);assert.equal(invoices[0].period_start,'2026-10-31T16:00:00.000Z');assert.equal(invoices[0].period_end,'2026-11-30T15:59:59.999Z');const items=await f.db.queryAll('SELECT * FROM invoice_items ORDER BY class_id');assert.deepEqual(items.map(x=>x.class_id),[2,3,8,9]);assert.equal(items.find(x=>x.class_id===8).amount,0);assert.equal((await f.db.queryAll("SELECT * FROM notifications WHERE type LIKE '%invoice%' ")).length,0);for(const inv of invoices)assert.equal(inv.total_amount,(await f.db.queryOne('SELECT SUM(amount) total FROM invoice_items WHERE invoice_id=?',[inv.id])).total)}finally{await f.close()}});
test('monthly retry/concurrent calls and manual claims never double bill',async()=>{const f=await fixture();try{await lesson(f,1,1,'2026-11-01T04:00:00Z');await lesson(f,2,1,'2026-11-02T04:00:00Z');await f.writer.generateRangeDrafts(1,'2026-11-01','2026-11-01');const results=await Promise.all([f.monthly.generateMonthlyDrafts('2026-11'),f.monthly.generateMonthlyDrafts('2026-11')]);assert.deepEqual(results.map(x=>x.created),[1,0]);assert.equal(results[1].alreadyProcessed,true);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoices')).n,2);assert.equal((await f.db.queryOne('SELECT COUNT(DISTINCT class_id) n FROM invoice_items')).n,2);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoice_items')).n,2);await lesson(f,3,1,'2026-11-03T04:00:00Z');assert.equal((await f.monthly.generateMonthlyDrafts('2026-11')).created,0);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoice_items')).n,2)}finally{await f.close()}});
test('failed monthly generation rolls back invoices and marker so a retry succeeds',async()=>{const f=await fixture();try{await lesson(f,1,1,'2026-11-10T04:00:00Z');await f.db.execute("CREATE TRIGGER fail_invoice_item BEFORE INSERT ON invoice_items BEGIN SELECT RAISE(ABORT,'injected failure'); END");await assert.rejects(f.monthly.generateMonthlyDrafts('2026-11'),/injected failure/);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoices')).n,0);assert.equal(await f.db.queryOne("SELECT value FROM settings WHERE key='monthly_invoice_run:2026-11'"),undefined);await f.db.execute('DROP TRIGGER fail_invoice_item');assert.equal((await f.monthly.generateMonthlyDrafts('2026-11')).created,1)}finally{await f.close()}});
test('cron endpoint fails closed without secret and rejects wrong or query-string credentials',async()=>{const saved=process.env.CRON_SECRET;let calls=0;const {GET}=loader({'next/server':{NextResponse:Response},'next/cache':{revalidatePath(){}},'@/lib/monthly-invoices':{dueInvoiceMonth:()=> '2026-11',generateMonthlyDrafts:async()=>{calls++;return{created:1}}}})('app/api/cron/monthly-invoices/route.ts');try{delete process.env.CRON_SECRET;assert.equal((await GET(new Request('https://app.test/api/cron/monthly-invoices'))).status,503);process.env.CRON_SECRET='test-only-secret';assert.equal((await GET(new Request('https://app.test/api/cron/monthly-invoices?secret=test-only-secret'))).status,401);assert.equal((await GET(new Request('https://app.test/api/cron/monthly-invoices',{headers:{authorization:'Bearer wrong'}}))).status,401);assert.equal(calls,0);assert.equal((await GET(new Request('https://app.test/api/cron/monthly-invoices',{headers:{authorization:'Bearer test-only-secret'}}))).status,200);assert.equal(calls,1)}finally{if(saved===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=saved}});

test('manual range interface partitions Malaysian months, rounds each line and permits zero drafts',async()=>{
  const f=await fixture();try{
    await lesson(f,1,2,'2026-10-31T15:59:00Z',{minutes:1});
    await lesson(f,2,2,'2026-10-31T16:00:00Z',{minutes:1});
    await lesson(f,3,2,'2026-11-01T04:00:00Z',{minutes:1});
    const ids=await f.writer.generateRangeDrafts(2,'2026-10-31','2026-11-01','Range note');
    assert.equal(ids.length,2);
    const invoices=await f.db.queryAll('SELECT * FROM invoices ORDER BY billing_month');
    assert.deepEqual(invoices.map(x=>[x.billing_month,x.total_amount,x.notes]),[['2026-10',1.09,'Range note'],['2026-11',2.18,'Range note']]);
    assert.equal((await f.db.queryOne('SELECT description FROM invoice_items WHERE class_id=2')).description.includes('1 Nov 2026'),true);
    await lesson(f,4,4,'2026-11-21T05:00:00Z',{trial:1});
    await lesson(f,5,5,'2026-11-21T05:00:00Z');
    for(const sid of [4,5]) {
      const [id]=await f.writer.generateRangeDrafts(sid,'2026-11-01','2026-11-30');
      assert.equal((await f.db.queryOne('SELECT total_amount FROM invoices WHERE id=?',[id])).total_amount,0);
    }
    await assert.rejects(f.writer.generateRangeDrafts(2,'2026-10-31','2026-11-01'),/No present, un-invoiced/);
  }finally{await f.close()}
});

test('manual and automatic interfaces race without sharing transaction choreography',async()=>{
  const f=await fixture();try{
    for(let i=1;i<=8;i++)await lesson(f,i,1,`2026-11-${String(i).padStart(2,'0')}T04:00:00Z`);
    const results=await Promise.allSettled([
      f.writer.generateRangeDrafts(1,'2026-11-01','2026-11-04'),
      f.monthly.generateMonthlyDrafts('2026-11'),
      f.writer.generateRangeDrafts(1,'2026-11-01','2026-11-30'),
    ]);
    assert(results.some(x=>x.status==='fulfilled'));
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoice_items')).n,8);
    assert.equal((await f.db.queryOne('SELECT COUNT(DISTINCT class_id) n FROM invoice_items')).n,8);
  }finally{await f.close()}
});

test('manual range rolls back earlier month documents and claims when a later month fails',async()=>{
  const f=await fixture();try{
    await lesson(f,1,1,'2026-10-31T15:59:00Z');
    await lesson(f,2,1,'2026-10-31T16:00:00Z');
    await f.db.execute("CREATE TRIGGER fail_second_month BEFORE INSERT ON invoice_items WHEN NEW.class_id=2 BEGIN SELECT RAISE(ABORT,'later month failure'); END");
    await assert.rejects(f.writer.generateRangeDrafts(1,'2026-10-31','2026-11-01'),/later month failure/);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoices')).n,0);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoice_items')).n,0);
    await f.db.execute('DROP TRIGGER fail_second_month');
    assert.equal((await f.writer.generateRangeDrafts(1,'2026-10-31','2026-11-01')).length,2);
  }finally{await f.close()}
});

test('generation interface rejects an invalid student instead of widening a manual range to everyone',async()=>{
  const f=await fixture();try{
    await lesson(f,1,1,'2026-11-10T01:00:00Z');
    for(const sid of [undefined,null,0,-1,1.2,Infinity,NaN])await assert.rejects(f.writer.generateRangeDrafts(sid,'2026-11-01','2026-11-30'),/valid student/);
    assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM invoices')).n,0);
    assert.equal((await f.writer.generateRangeDrafts(1,'2026-11-01','2026-11-30')).length,1);
  }finally{await f.close()}
});

test('legacy and offset timestamps retain Malaysian billing month independently of server timezone',async()=>{
  const previous=process.env.TZ;process.env.TZ='Asia/Kuala_Lumpur';
  const f=await fixture();try{
    await lesson(f,1,1,'2026-10-31 17:00:00');
    await lesson(f,2,2,'2026-11-01T00:00:00+07:00');
    await f.writer.generateRangeDrafts(1,'2026-11-01','2026-11-30');
    assert.equal((await f.monthly.generateMonthlyDrafts('2026-11')).created,1);
    assert.deepEqual((await f.db.queryAll('SELECT billing_month FROM invoices ORDER BY student_id')).map(i=>i.billing_month),['2026-11','2026-11']);
    assert((await f.db.queryAll('SELECT description FROM invoice_items')).every(i=>i.description.includes('1 Nov 2026')));
  }finally{await f.close();if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous}
});
