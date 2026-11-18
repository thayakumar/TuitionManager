const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  Module = require("node:module"),
  ts = require("typescript");
const root = path.resolve(__dirname, "..");
function loader(stubs = {}) {
  const cache = new Map();
  return function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module);
    m.paths = Module._nodeModulePaths(root);
    m.filename = file;
    cache.set(file, m);
    const original = m.require.bind(m);
    m.require = (name) => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
      if (name.startsWith("."))
        return load(
          path.relative(root, path.resolve(path.dirname(file), name)) + ".ts",
        );
      return original(name);
    };
    m._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      file,
    );
    return m.exports;
  };
}

test('private PDFs expose tiny HEAD metadata, byte ranges and bounded cancellable streaming without a duplicate full probe', async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuition-pdf-')),oldUrl=process.env.TURSO_DATABASE_URL,oldConnector=process.env.APPS_SCRIPT_UPLOAD_URL,oldFetch=global.fetch;
 process.env.TURSO_DATABASE_URL='file:'+path.join(dir,'db.sqlite');process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';
 let admin=true;const calls=[];const bytes=Buffer.alloc(3*1024*1024+333,65);bytes.write('%PDF-1.7\n');
 const load=loader({'@/lib/auth':{verifyAdminSession:async()=>admin,getStudentSession:async()=>null},'@/lib/storage-config':{getStorageSecret:async()=> 'secret'},'next/server':{NextResponse:Response}}),db=load('lib/db.ts');
 try {
  await db.ensureMigrated();global.fetch=async(url,options)=>{const p=JSON.parse(options.body);calls.push(p);const end=Math.min(bytes.length,p.offset+p.length);return Response.json({version:2,success:true,base64:bytes.subarray(p.offset,end).toString('base64'),total:bytes.length,nextOffset:end,fileName:'Lesson.pdf',mimeType:'application/pdf'})};
  const route=load('app/api/files/[fileId]/route.ts');const request=(method='GET',range)=>{const r=new Request('https://app.test/api/files/privatepdffile?inline=1',{method,headers:range?{Range:range}:{}});r.nextUrl=new URL(r.url);return r};const context={params:Promise.resolve({fileId:'privatepdffile'})};
  let r=await route.HEAD(request('HEAD'),context);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal(r.headers.get('content-length'),String(bytes.length));assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal(await r.text(),'');assert.equal(calls.length,1);assert.equal(calls[0].length,1);
  calls.length=0;r=await route.GET(request('GET','bytes=1048576-1048625'),context);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes 1048576-1048625/${bytes.length}`);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(1048576,1048626));assert.deepEqual(calls.map(c=>[c.offset,c.length]),[[0,1],[1048576,50]]);
  r=await route.GET(request('GET','bytes=-17'),context);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(-17));
  for(const range of ['bytes=9999999-','bytes=8-2','bytes=0-2,4-6','bytes=-0']){r=await route.GET(request('GET',range),context);assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */'+bytes.length)}
  calls.length=0;r=await route.GET(request(),context);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^inline/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.equal(calls.length,4);assert(calls.every(c=>c.length<=1024*1024));assert.equal(calls[0].offset,0);assert.equal(calls[1].offset,1024*1024);
  calls.length=0;r=await route.GET(request(),context);await r.body.cancel();const n=calls.length;await new Promise(r=>setTimeout(r,20));assert.equal(calls.length,n);assert(n<=2,'canceled stream must not read the entire file');
  admin=false;calls.length=0;r=await route.HEAD(request('HEAD'),context);assert.equal(r.status,401);assert.equal(calls.length,0,'HEAD retains full authorization');
 }finally{db.getClient().close();global.fetch=oldFetch;if(oldUrl===undefined)delete process.env.TURSO_DATABASE_URL;else process.env.TURSO_DATABASE_URL=oldUrl;if(oldConnector===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=oldConnector;fs.rmSync(dir,{recursive:true,force:true})}
});

test('family PDF and image reads require matching chat references, parent upload hash or exact profile; revoked and foreign tokens fail closed',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuition-family-files-')),env=process.env.TURSO_DATABASE_URL,connector=process.env.APPS_SCRIPT_UPLOAD_URL,original=global.fetch;process.env.TURSO_DATABASE_URL='file:'+path.join(dir,'db.sqlite');process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';let sid=null;
 const load=loader({'@/lib/auth':{verifyAdminSession:async()=>false,getStudentSession:async()=>sid},'@/lib/storage-config':{getStorageSecret:async()=> 'secret'},'next/server':{NextResponse:Response}}),db=load('lib/db.ts');
 try{await db.ensureMigrated();await db.execute("INSERT INTO students(id,name,profile_photo_url) VALUES(1,'Alice','/api/files/profileimageid?inline=1'),(2,'Bob',NULL)");await db.execute("INSERT INTO share_tokens(student_id,token,active)VALUES(1,'alice-parent',1),(2,'bob-parent',1)");const hash=require('node:crypto').createHash('sha256').update('alice-parent').digest('hex');
 await db.execute("INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,parent_token_hash)VALUES('chatsharedfile','admin',NULL,'shared.pdf',NULL),('studentprivate','student',1,'private.pdf',NULL),('profileimageid','student',1,'profile.png',NULL)");await db.execute("INSERT INTO uploaded_files(file_id,owner_role,owner_student_id,file_name,parent_token_hash)VALUES('parentownfile','student',1,'parent.pdf',?)",[hash]);
 await db.execute("INSERT OR IGNORE INTO family_chat_rooms(student_id) VALUES(1),(2)");const room=await db.queryOne('SELECT id FROM family_chat_rooms WHERE student_id=1');await db.execute("INSERT INTO family_chat_messages(room_id,author_role,author_key,body,attachments,client_id,created_at)VALUES(?,'admin','admin','PDF attached',?,'fixture','2026-11-18')",[room.id,JSON.stringify([{fileUrl:'/api/files/chatsharedfile',fileName:'shared.pdf',fileType:'application/pdf'}])]);
 global.fetch=async(_url,o)=>{const p=JSON.parse(o.body),b=Buffer.from('%PDF-1.7\n'),end=Math.min(b.length,p.offset+p.length);return Response.json({version:2,success:true,total:b.length,nextOffset:end,base64:b.subarray(p.offset,end).toString('base64'),fileName:'file.pdf',mimeType:'application/pdf'})};const route=load('app/api/files/[fileId]/route.ts');async function read(id,token){const r=new Request('https://app.test/api/files/'+id+'?inline=1'+(token?'&parent_token='+token:''),{method:'HEAD'});r.nextUrl=new URL(r.url);return route.HEAD(r,{params:Promise.resolve({fileId:id})})}
 assert.equal((await read('chatsharedfile','alice-parent')).status,200);assert.equal((await read('parentownfile','alice-parent')).status,200);assert.equal((await read('profileimageid','alice-parent')).status,200);assert.equal((await read('studentprivate','alice-parent')).status,404);assert.equal((await read('chatsharedfile','bob-parent')).status,404);sid=1;assert.equal((await read('parentownfile')).status,404);assert.equal((await read('chatsharedfile')).status,200);sid=2;assert.equal((await read('chatsharedfile')).status,404);sid=null;await db.execute("UPDATE family_chat_messages SET deleted_at='2026-11-18'");assert.equal((await read('chatsharedfile','alice-parent')).status,404);await db.execute("UPDATE share_tokens SET active=0 WHERE token='alice-parent'");assert.equal((await read('parentownfile','alice-parent')).status,404);
 }finally{db.getClient().close();global.fetch=original;if(env===undefined)delete process.env.TURSO_DATABASE_URL;else process.env.TURSO_DATABASE_URL=env;if(connector===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=connector;fs.rmSync(dir,{recursive:true,force:true})}
});
