const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

async function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuition-post-work-'));
  process.env.TURSO_DATABASE_URL = 'file:' + path.join(dir, 'work.db');
  delete process.env.TURSO_AUTH_TOKEN;
  const cache = new Map();
  function load(relative) {
    const file = path.join(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module);
    m.paths = Module._nodeModulePaths(root);
    cache.set(file, m);
    const original = m.require.bind(m);
    m.require = name => name.startsWith('.')
      ? load(path.relative(root, path.resolve(path.dirname(file), name)) + '.ts')
      : original(name);
    m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, file);
    return m.exports;
  }
  const db = load('lib/db.ts');
  await db.ensureMigrated();
  await db.execute("INSERT INTO students(id,name,active)VALUES(1,'Alice',1),(2,'Other student',1)");
  await db.execute("INSERT INTO posts(id,student_id,type,title,max_points)VALUES(1,1,'assignment','Assignment',200),(2,2,'assignment','Foreign',100),(3,1,'quiz','Legacy quiz',20),(4,1,'material','Material',NULL),(5,1,'announcement','Announcement',NULL)");
  return {
    db, work: load('lib/submitted-work.ts'),
    close() { db.getClient().close(); fs.rmSync(dir, {recursive:true,force:true}); },
  };
}
async function projection(f, id, postId, studentId, version, grade = null) {
  await f.db.execute(
    "INSERT INTO submissions(id,post_id,student_id,version,content,file_url,grade,graded_at,submitted_at)VALUES(?,?,?,?,?,?,?,?,?)",
    [id,postId,studentId,version,'Current '+id,null,grade,grade?'2026-11-20T02:00:00Z':null,'2026-11-20T01:00:00Z'],
  );
}
async function attempt(f, submissionId, version, grade, maximum, content, file = null) {
  await f.db.execute(
    "INSERT INTO submission_versions(submission_id,version,content,file_url,grade,feedback,submitted_at,graded_at,max_points)VALUES(?,?,?,?,?,?,?,?,?)",
    [submissionId,version,content,file,grade,grade?'Feedback '+version:null,'2026-11-20T01:00:00Z',grade?'2026-11-20T02:00:00Z':null,maximum],
  );
}

test('post-work scope rejects foreign, invalid and inactive owners before reading attachments or work', async () => {
  const f = await fixture();
  try {
    const original = f.db.queryAll;
    let dependentReads = 0;
    f.db.queryAll = async (sql,args) => { dependentReads++; return original(sql,args); };
    for (const ids of [[1,2],[2,1],[1,999],[0,1],[1,NaN],[1,-1]]) assert.equal(await f.work.loadPostWork(...ids),null);
    await f.db.execute('UPDATE students SET active=0 WHERE id=1');
    assert.equal(await f.work.loadPostWork(1,1),null);
    assert.equal(dependentReads,0);
  } finally { f.close(); }
});

test('post-work returns one scoped current projection with ordered lineage and saved grade maxima', async () => {
  const f = await fixture();
  try {
    await projection(f,10,1,1,3,'8');
    await attempt(f,10,1,'75',100,'Original');
    await attempt(f,10,2,null,100,null,'https://example.com/attempt-2.pdf');
    await attempt(f,10,3,'8',10,'Current 10');
    await projection(f,20,2,2,1,'99');
    await attempt(f,20,1,'99',100,'FOREIGN PRIVATE WORK');
    await f.db.execute("INSERT INTO post_attachments(post_id,file_name,file_url,file_type)VALUES(1,'Worksheet','https://example.com/own.pdf','application/pdf'),(2,'Other file','https://example.com/other.pdf','application/pdf')");
    const original = f.db.queryAll;
    let workReads = 0, currentBodyCopies = 0;
    f.db.queryAll = async (sql,args) => { const rows = await original(sql,args); if (sql.includes('FROM submissions')) { workReads++; currentBodyCopies=(JSON.stringify(rows).match(/Current 10/g)||[]).length; } return rows; };
    const result = await f.work.loadPostWork(1,1);
    assert.equal(result.acceptsWork,true);
    assert.equal(result.submission.version,3);
    assert.equal(result.submission.grade,'8');
    assert.equal(result.submission.max_points,10);
    assert.equal(result.post.max_points,200);
    assert.deepEqual(result.attempts.map(a=>[a.version,a.grade,a.max_points]),[[3,'8',10],[2,null,100],[1,'75',100]]);
    assert.equal(result.attempts[1].content,null);
    assert.equal(result.attempts[1].file_url,'https://example.com/attempt-2.pdf');
    assert.equal(result.attachments.length,1);
    assert(!JSON.stringify(result).includes('FOREIGN'));
    assert(!JSON.stringify(result).includes('other.pdf'));
    assert.equal(workReads,1,'projection and history cross one SQL snapshot');
    assert.equal(currentBodyCopies,2,'current body appears only in its projection and retained latest attempt, not on every history row');
  } finally { f.close(); }
});

test('material and announcement reads never expose stale submitted work, while legacy quizzes accept work', async () => {
  const f = await fixture();
  try {
    await projection(f,10,3,1,1);
    await projection(f,11,4,1,1);
    await projection(f,12,5,1,1);
    assert.equal((await f.work.loadPostWork(1,3)).submission.id,10);
    for (const postId of [4,5]) {
      const result = await f.work.loadPostWork(1,postId);
      assert.equal(result.acceptsWork,false);
      assert.equal(result.submission,undefined);
      assert.deepEqual(result.attempts,[]);
    }
    const empty = await f.work.loadPostWork(1,1);
    assert.equal(empty.acceptsWork,true);
    assert.equal(empty.submission,undefined);
    assert.deepEqual(empty.attempts,[]);
  } finally { f.close(); }
});

test('legacy projection without a version remains readable, and a recorded null maximum stays null', async () => {
  const f = await fixture();
  try {
    await projection(f,10,1,1,1,'7');
    const legacy = await f.work.loadPostWork(1,1);
    assert.equal(legacy.submission.grade,'7');
    assert.equal(Object.hasOwn(legacy.submission,'max_points'),false);
    assert.deepEqual(legacy.attempts,[]);
    await attempt(f,10,1,'7',null,'Current 10');
    const withHistory = await f.work.loadPostWork(1,1);
    assert.equal(withHistory.submission.max_points,null);
    assert.equal(withHistory.attempts[0].max_points,null);
  } finally { f.close(); }
});
