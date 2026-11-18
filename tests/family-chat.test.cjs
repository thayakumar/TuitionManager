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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuition-family-chat-"));
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
    actions = load("lib/family-chat.ts");
  return {
    db,
    actions,
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

const admin={viewer:'admin'},student={viewer:'student'},parent={viewer:'parent',parentToken:'parent-alice'};
const send=(body,clientId='message-0001',extra={})=>({action:'send',body,clientId,...extra});
test('automatic family rooms migrate existing students and are created atomically for new students',async()=>{const f=fixture();try{await f.seed();const sid=await f.studentActions.createStudentQuick(form({name:'New Child',hourly_rate:80}));assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_rooms WHERE student_id=?',[sid])).n,1);await f.db.execute("UPDATE settings SET value='6' WHERE key='app_schema_version'");await f.db.execute('DELETE FROM family_chat_rooms');const cold=f.coldDb();try{await cold.ensureMigrated();assert.equal((await cold.queryOne('SELECT COUNT(*) n FROM family_chat_rooms')).n,3)}finally{cold.getClient().close()}}finally{f.close()}});
test('three roles share only their family; own-message identity and unread/read receipts follow the actual viewer',async()=>{const f=fixture();try{await f.seed();const one=await f.actions.mutateChat(1,send('Hello from tutor'),admin);f.as('student',1);const two=await f.actions.mutateChat(1,send('Student reply','message-0002'),student);f.as('none');await f.actions.mutateChat(1,send('Parent reply','message-0003'),parent);const p=await f.actions.chatMessages(1,parent);assert.deepEqual(p.messages.map(m=>[m.authorRole,m.isOwn]),[['admin',false],['student',false],['parent',true]]);assert.equal((await f.actions.chatRooms(parent)).rooms[0].unreadCount,2);await f.actions.mutateChat(1,{action:'read',lastReadId:two.id},parent);assert.equal((await f.actions.chatRooms(parent)).rooms[0].unreadCount,0);const read=await f.actions.chatMessages(1,parent);assert(read.messages[0].readBy.includes('parent'));assert(!read.messages[2].readBy.includes('parent'));await assert.rejects(f.actions.chatMessages(2,parent),/Chat not found/);await assert.rejects(f.actions.mutateChat(2,send('foreign','message-0004'),parent),/Chat not found/);f.as('student',2);assert.equal((await f.actions.chatRooms(student)).rooms.length,1);await assert.rejects(f.actions.chatMessages(1,student),/Chat not found/);f.as('none');await assert.rejects(f.actions.chatMessages(1,student),/Sign in/);await f.db.execute("UPDATE share_tokens SET active=0 WHERE token='parent-alice'");await assert.rejects(f.actions.chatMessages(1,parent),/no longer active/);f.as('student',1);await f.db.execute('UPDATE students SET active=0 WHERE id=1');await assert.rejects(f.actions.chatMessages(1,student),/inactive/)}finally{f.close()}});
test('chat validates content, retries once, paginates, protects replies, and preserves edit/delete history',async()=>{const f=fixture();try{await f.seed();await assert.rejects(f.actions.mutateChat(1,send('<p><br></p>'),admin),/Write a message/);const first=await f.actions.mutateChat(1,send('<p>Hello<script>bad()</script></p>'),admin);const repeated=await f.actions.mutateChat(1,send('duplicate'),admin);assert.equal(first.id,repeated.id);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_messages')).n,1);const foreign=await f.actions.mutateChat(2,send('Bob family','message-bob'),admin);await assert.rejects(f.actions.mutateChat(1,send('reply','message-reply',{replyTo:foreign.id}),admin),/Reply message not found/);const reply=await f.actions.mutateChat(1,send('reply','message-reply',{replyTo:first.id}),admin);await f.actions.mutateChat(1,{action:'edit',messageId:first.id,body:'Corrected'},admin);f.as('student',1);await assert.rejects(f.actions.mutateChat(1,{action:'edit',messageId:first.id,body:'Hijack'},student),/cannot change/);await assert.rejects(f.actions.mutateChat(1,{action:'delete',messageId:first.id},student),/cannot change/);f.as('admin');await f.actions.mutateChat(1,{action:'delete',messageId:first.id},admin);const history=await f.actions.chatMessages(1,admin);assert.equal(history.messages[0].body,'');assert(history.messages[0].deletedAt);assert.equal(history.messages[1].replyTo,first.id);assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_edits')).n,2);for(let i=0;i<55;i++)await f.actions.mutateChat(1,send('Bulk '+i,'bulk-message-'+i),admin);const newest=await f.actions.chatMessages(1,admin);assert.equal(newest.messages.length,50);assert(newest.hasMore);const old=await f.actions.chatMessages(1,admin,{before:newest.messages[0].id});assert.equal(old.messages.length,7);const delta=await f.actions.chatMessages(1,admin,{after:reply.id});assert.equal(delta.messages.length,50);assert(delta.hasMore);const refreshed=await f.actions.chatMessages(1,admin,{refreshIds:[first.id,reply.id]});assert(refreshed.messages.find(m=>m.id===first.id).deletedAt);assert.equal(refreshed.messages.find(m=>m.id===reply.id).replyPreview.deletedAt,refreshed.messages.find(m=>m.id===first.id).deletedAt);assert.equal(refreshed.messages.length,52);await assert.rejects(f.actions.chatMessages(1,admin,{refreshIds:Array(201).fill(first.id)}),/Invalid refresh/);}finally{f.close()}});
test('attachments and inline images require uploader ownership; parent credentials are never stored in messages',async()=>{const f=fixture();try{await f.seed();const hash=require('node:crypto').createHash('sha256').update('parent-alice').digest('hex');await f.db.execute("INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type,parent_token_hash) VALUES('student-image-0001','student',1,'work.png','image/png',NULL),('other-image-000002','student',2,'other.png','image/png',NULL),('parent-image-00001','student',1,'family.png','image/png',?),('tutor-image-000001','admin',NULL,'tutor.png','image/png',NULL)",[hash]);f.as('student',1);await f.actions.mutateChat(1,send('', 'student-files',{attachments:[{fileUrl:'/api/files/student-image-0001',fileName:'fake.exe'}]}),student);await assert.rejects(f.actions.mutateChat(1,send('foreign','foreign-files',{attachments:[{fileUrl:'/api/files/other-image-000002'}]}),student),/does not belong/);await assert.rejects(f.actions.mutateChat(1,send('<img src="/api/files/tutor-image-000001?inline=1">','inline-foreign'),student),/does not belong/);f.as('none');await assert.rejects(f.actions.mutateChat(1,send('foreign','parent-forged',{attachments:[{fileUrl:'/api/files/student-image-0001'}]}),parent),/not uploaded with your parent/);await f.actions.mutateChat(1,send('<img src="/api/files/parent-image-00001?inline=1&parent_token=parent-alice">','parent-file',{attachments:[{fileUrl:'/api/files/parent-image-00001?inline=1&parent_token=parent-alice'}]}),parent);const row=await f.db.queryOne("SELECT body,attachments FROM family_chat_messages WHERE client_id='parent-file'");assert(!JSON.stringify(row).includes('parent-alice'));assert(!JSON.stringify(row).includes('parent_token'));assert.match(row.body,/src="\/api\/files\/parent-image-00001\?inline=1"/);assert.equal(JSON.parse((await f.db.queryOne("SELECT attachments FROM family_chat_messages WHERE client_id='student-files'")).attachments)[0].fileName,'work.png')}finally{f.close()}});

test('navbar unread summaries aggregate scoped counts without returning room names or message bodies',async()=>{
 const f=fixture();try{
  await f.seed();
  const tutor=await f.actions.mutateChat(1,send('Private Alice tutor message'),admin);
  await f.actions.mutateChat(2,send('Private Bob tutor message','bob-summary-message'),admin);
  assert.deepEqual(await f.actions.chatUnread(admin),{unreadCount:0,viewerRole:'admin'});
  f.as('student',1);
  assert.deepEqual(await f.actions.chatUnread(student),{unreadCount:1,viewerRole:'student'});
  await f.actions.mutateChat(1,send('Private student reply','student-summary'),student);
  await f.actions.mutateChat(1,{action:'read',lastReadId:tutor.id},student);
  assert.deepEqual(await f.actions.chatUnread(student),{unreadCount:0,viewerRole:'student'});
  f.as('none');
  assert.deepEqual(await f.actions.chatUnread(parent),{unreadCount:2,viewerRole:'parent'});
  await f.actions.mutateChat(1,send('Private parent reply','parent-summary'),parent);
  f.as('admin');
  const summary=await f.actions.chatUnread(admin);
  assert.deepEqual(summary,{unreadCount:2,viewerRole:'admin'});
  assert.deepEqual(Object.keys(summary).sort(),['unreadCount','viewerRole']);
  assert(!JSON.stringify(summary).includes('Private'));
  const studentMessage=(await f.actions.chatMessages(1,admin)).messages.find(m=>m.authorRole==='student');
  await f.actions.mutateChat(1,{action:'delete',messageId:studentMessage.id},admin);
  assert.deepEqual(await f.actions.chatUnread(admin),{unreadCount:1,viewerRole:'admin'});
  await f.actions.mutateChat(1,{action:'read'},admin);
  assert.deepEqual(await f.actions.chatUnread(admin),{unreadCount:0,viewerRole:'admin'});
  f.as('none');await f.db.execute("UPDATE share_tokens SET active=0 WHERE token='parent-alice'");
  await assert.rejects(f.actions.chatUnread(parent),/no longer active/);
 }finally{f.close()}
});

test('send acknowledges the committed message in three SQL statements and exposes correlation IDs only to its author',async()=>{
 const f=fixture();try{
  await f.seed();
  const client=f.db.getClient(),transaction=client.transaction.bind(client),statements=[];
  client.transaction=async(...args)=>{const tx=await transaction(...args),execute=tx.execute.bind(tx);tx.execute=async(statement,...rest)=>{statements.push(typeof statement==='string'?statement:statement.sql);return execute(statement,...rest)};return tx};
  const sent=await f.actions.mutateChat(1,send('<p>Instant <b>message</b><script>bad()</script></p>','ack-message-one'),admin);
  assert.equal(statements.length,3,'one room/scope query, one duplicate lookup and one insert-returning; no follow-up thread fetch');
  assert.equal(sent.message.id,sent.id);assert.equal(sent.message.clientId,'ack-message-one');assert.equal(sent.message.authorName,'Tutor');assert.equal(sent.message.isOwn,true);assert.equal(sent.message.canEdit,true);assert(!sent.message.body.includes('<script>'));assert.deepEqual(sent.message.attachments,[]);
  assert.deepEqual(sent.message,(await f.actions.chatMessages(1,admin)).messages[0]);
  f.as('student',1);const studentView=(await f.actions.chatMessages(1,student)).messages[0];assert(!('clientId' in studentView));assert.equal(studentView.isOwn,false);
  const studentReply=await f.actions.mutateChat(1,send('My reply','ack-student-reply',{replyTo:sent.id}),student);assert.equal(studentReply.message.authorName,'Alice');assert.equal(studentReply.message.replyPreview.id,sent.id);assert.equal(studentReply.message.replyPreview.authorName,'Tutor');
  const edited=await f.actions.mutateChat(1,{action:'edit',messageId:studentReply.id,body:'Updated reply'},student);assert.equal(edited.message.body,'Updated reply');assert.equal(edited.message.id,studentReply.id);assert(edited.message.editedAt);
 }finally{f.close()}
});

test('lost send acknowledgements replay canonical stored content before revalidating obsolete attachments',async()=>{
 const f=fixture();try{
  await f.seed();const hash=require('node:crypto').createHash('sha256').update('parent-alice').digest('hex');
  await f.db.execute("INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,mime_type,parent_token_hash) VALUES('parent-retry-file','student',1,'lesson.png','image/png',?)",[hash]);
  f.as('none');const draft=send('<img src="/api/files/parent-retry-file?inline=1&parent_token=parent-alice">','lost-ack-parent',{attachments:[{fileUrl:'/api/files/parent-retry-file?parent_token=parent-alice'}]});
  const first=await f.actions.mutateChat(1,draft,parent);assert(!JSON.stringify(first).includes('parent-alice'));assert(!JSON.stringify(first).includes('parent_token'));
  await f.db.execute("DELETE FROM uploaded_files WHERE file_id='parent-retry-file'");
  f.as('admin');await f.actions.mutateChat(1,{action:'read'},admin);f.as('none');
  const retried=await f.actions.mutateChat(1,draft,parent);assert.equal(retried.id,first.id);assert.equal(retried.message.body,first.message.body);assert.deepEqual(retried.message.attachments,first.message.attachments);assert(retried.message.readBy.includes('admin'));
  assert.equal((await f.db.queryOne('SELECT COUNT(*) n FROM family_chat_messages')).n,1);
  await f.db.execute("UPDATE share_tokens SET active=0 WHERE token='parent-alice'");await assert.rejects(f.actions.mutateChat(1,draft,parent),/no longer active/);
 }finally{f.close()}
});

test('attachment and inline image ownership lookups are batched into one database statement',async()=>{
 const f=fixture();try{
  await f.seed();await f.db.execute("INSERT INTO uploaded_files(file_id,owner_role,file_name,mime_type) VALUES('tutor-latency-one','admin','one.png','image/png'),('tutor-latency-two','admin','two.pdf','application/pdf')");
  const client=f.db.getClient(),transaction=client.transaction.bind(client),statements=[];client.transaction=async(...args)=>{const tx=await transaction(...args),execute=tx.execute.bind(tx);tx.execute=async(statement,...rest)=>{statements.push(typeof statement==='string'?statement:statement.sql);return execute(statement,...rest)};return tx};
  const sent=await f.actions.mutateChat(1,send('<img src="/api/files/tutor-latency-one?inline=1">','batched-send',{attachments:[{fileUrl:'/api/files/tutor-latency-one'},{fileUrl:'/api/files/tutor-latency-two'}]}),admin);
  assert.equal(statements.filter(s=>s.includes('FROM uploaded_files')).length,1);assert.equal(statements.length,4);assert.deepEqual(sent.message.attachments.map(x=>x.fileName),['one.png','two.pdf']);
 }finally{f.close()}
});

test('incremental polls include only role-level read positions without exposing identity keys or parent credentials',async()=>{
 const f=fixture();try{
  await f.seed();const tutor=await f.actions.mutateChat(1,send('Tutor greeting','positions-tutor'),admin);
  f.as('student',1);const reply=await f.actions.mutateChat(1,send('Student reply','positions-student'),student);await f.actions.mutateChat(1,{action:'read',lastReadId:tutor.id},student);
  f.as('none');await f.actions.mutateChat(1,{action:'read',lastReadId:reply.id},parent);
  const delta=await f.actions.chatMessages(1,parent,{after:reply.id});assert.equal(delta.messages.length,0);
  assert.deepEqual(delta.readPositions.sort((a,b)=>String(a.role).localeCompare(String(b.role))),[{role:'parent',lastReadId:reply.id},{role:'student',lastReadId:tutor.id}]);
  for(const position of delta.readPositions)assert.deepEqual(Object.keys(position).sort(),['lastReadId','role']);
  assert(!JSON.stringify(delta).includes('parent-alice'));assert(!JSON.stringify(delta).includes('parent:'));assert(!JSON.stringify(delta).includes('actor_key'));
  const p=await f.actions.chatMessages(1,parent);assert(p.messages.every(m=>!('clientId' in m)));
  f.as('student',1);const own=await f.actions.chatMessages(1,student);assert.equal(own.messages.find(m=>m.id===reply.id).clientId,'positions-student');assert(!('clientId' in own.messages.find(m=>m.id===tutor.id)));
 }finally{f.close()}
});
