const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), Module = require('node:module'), ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file, stubs = {}) {
  const filename = path.join(root, file), m = new Module(filename, module);
  m.filename = filename; m.paths = Module._nodeModulePaths(root);
  const original = m.require.bind(m);
  m.require = name => Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText, filename);
  return m.exports;
}
test('actionable dashboard counts all tasks, limits glance lists, uses current work and hides finances', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuition-dashboard-'));
  process.env.TURSO_DATABASE_URL = 'file:' + path.join(dir, 'fixture.db');
  delete process.env.TURSO_AUTH_TOKEN;
  const db = load('lib/db.ts');
  let authorized = true, reads = 0;
  const Pass = ({children, ...props}) => React.createElement('div', props, children);
  const stubs = {
    '@/lib/db': {...db, queryAll:async (...a)=>{reads++;return db.queryAll(...a)},queryOne:async (...a)=>{reads++;return db.queryOne(...a)}},
    '@/lib/auth': {requireAdminPage:async()=>{if(!authorized)throw Error('UNAUTHORIZED')}},
    '@/lib/finance': load('lib/finance.ts'),
    '@/lib/domain/business-time':load('lib/domain/business-time.ts', {'../action-errors':load('lib/action-errors.ts')}),
    '@/lib/format':load('lib/format.ts'),
    'next/link': ({children,href,...p})=>React.createElement('a',{...p,href},children),
    '@/components/ui/card':{Card:Pass,CardHeader:Pass,CardTitle:Pass,CardContent:Pass,CardDescription:Pass},
    '@/components/ui/badge':{Badge:Pass},
    '@/components/dashboard-actions':{DashboardQuickActions:()=>React.createElement('button',null,'Schedule a lesson')},
    '@/components/attendance-chart':{AttendanceChart:()=>React.createElement('div',null,'ATTENDANCE_DONUT')},
    '@/components/lesson-status-badge':{LessonStatusBadge:({status})=>React.createElement('span',null,status)},
  };
  const Dashboard = load('app/dashboard/page.tsx', stubs).default;
  try {
    await db.ensureMigrated();
    await db.execute("INSERT INTO students(id,name,active) VALUES(1,'Active pupil',1),(2,'Inactive pupil',0)");
    for(let n=1;n<=7;n++) {
      await db.getClient().execute({sql:"INSERT INTO classes(id,student_id,scheduled_at,status,attendance) VALUES(?,1,?,'completed','present')",args:[n,`2000-01-0${n}T01:00:00Z`]});
      await db.getClient().execute({sql:"INSERT INTO classes(id,student_id,scheduled_at,status) VALUES(?,1,?,'scheduled')",args:[n+10,`2000-01-0${n} 02:00:00`]});
      await db.getClient().execute({sql:"INSERT INTO classes(id,student_id,scheduled_at,status) VALUES(?,1,?,'scheduled')",args:[n+20,`2099-01-0${n}T01:00:00Z`]});
    }
    await db.execute("INSERT INTO classes(id,student_id,scheduled_at,status,attendance) VALUES(40,1,'2000-01-01T00:00:00Z','completed','absent'),(41,1,'2000-01-01T00:00:00Z','canceled',NULL),(42,1,'2099-01-01T00:00:00Z','completed','present'),(43,1,'2000-01-01T00:00:00Z','completed','late')");
    await db.execute("INSERT INTO reports(class_id,topics_covered) VALUES(43,'Reported already')");
    await db.execute("INSERT INTO reschedule_requests(class_id,student_id,preferred_time_1,status) VALUES(11,1,'2099-02-01T00:00:00Z','pending'),(12,1,'2099-02-01T00:00:00Z','pending'),(13,1,'2099-02-01T00:00:00Z','rejected')");
    await db.execute("INSERT INTO posts(id,student_id,type,title) VALUES(1,1,'assignment','Grade me'),(2,1,'quiz','Quiz to grade'),(3,1,'assignment','Previously graded'),(4,1,'material','No submission workflow')");
    await db.execute("INSERT INTO submissions(id,post_id,student_id,grade,graded_at) VALUES(1,1,1,NULL,NULL),(2,2,1,NULL,NULL),(3,3,1,'90','2000-01-01'),(4,4,1,NULL,NULL)");
    await db.execute("INSERT INTO submission_versions(submission_id,version,content,grade,graded_at,submitted_at) VALUES(1,1,'Old graded work','80','2000-01-01','2000-01-01'),(3,1,'Old ungraded work',NULL,NULL,'2000-01-01')");
    const html = renderToStaticMarkup(await Dashboard());
    assert(html.includes('lg:grid-cols-3'));
    assert.equal((html.match(/metric-card/g)||[]).length, 6);
    assert(html.includes('Reports overdue')); assert(html.includes('Needs Your Attention'));
    assert(html.includes('Showing 5 of 7'));
    assert.equal((html.match(/href="\/classes\/\d+\?report=true"/g)||[]).length,5);
    const attention = html.split('id="needs-attention"')[1].split('Today’s lessons')[0];
    assert.equal((attention.match(/href="\/classes\/\d+"/g)||[]).length,5);
    assert(/Grade student submissions<\/span><div[^>]*>2<\/div>/.test(html));
    assert(/Review reschedule requests<\/span><div[^>]*>2<\/div>/.test(html));
    assert(html.includes('ATTENDANCE_DONUT'));
    const upcoming = html.split('id="upcoming-lessons"')[1];
    assert.equal((upcoming.match(/href="\/classes\//g)||[]).length,5);
    for(const forbidden of ['Revenue','Unpaid invoices','financial-history','A few next steps','outstanding','all caught up!'])assert(!html.includes(forbidden),forbidden);
    await db.execute("UPDATE reschedule_requests SET status='rejected'");
    await db.execute("UPDATE classes SET status='canceled'");
    await db.execute("UPDATE submissions SET grade='80',graded_at='2000-01-01'");
    const empty = renderToStaticMarkup(await Dashboard());
    assert(empty.includes('You&#x27;re all caught up!'));
    assert(!empty.includes('Reports to write')); assert(!empty.includes('Grade student submissions')); assert(!empty.includes('Review reschedule requests')); assert(!empty.includes('Unmarked lessons'));
    assert(empty.includes('No upcoming lessons scheduled.'));
    authorized = false; const before = reads;
    await assert.rejects(Dashboard(),/UNAUTHORIZED/); assert.equal(reads,before,'no private query before authorization');
  } finally {db.getClient().close();fs.rmSync(dir,{recursive:true,force:true})}
});
