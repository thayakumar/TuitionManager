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

test('completed bytes survive a transient finish failure without creating another upload session',async()=>{
 const previous=global.fetch;let begin=0,chunks=0,finish=0;
 global.fetch=async(url,options)=>{if(url==='/api/upload/chunk'){chunks++;return Response.json({complete:true,nextOffset:3})}const input=JSON.parse(options.body);if(input.action==='begin'){begin++;return Response.json({ticket:'same-session'})}finish++;if(finish===1)throw new TypeError('Network failed after the bytes completed');return Response.json({fileUrl:'https://drive.google.com/file/d/completedupload/view',fileName:'work.txt'})};
 try{const result=await loader()('lib/upload-client.ts').uploadFile(new File(['abc'],'work.txt',{type:'text/plain'}));assert.equal(result.fileName,'work.txt');assert.deepEqual({begin,chunks,finish},{begin:1,chunks:1,finish:2})}finally{global.fetch=previous}
});

test('an inconsistent complete acknowledgement is rejected rather than finalizing incomplete bytes',async()=>{
 const previous=global.fetch;let finish=0;global.fetch=async(url,options)=>{if(url==='/api/upload/chunk')return Response.json({complete:true,nextOffset:0});if(JSON.parse(options.body).action==='begin')return Response.json({ticket:'same-session'});finish++;return Response.json({fileUrl:'https://drive.google.com/file/d/partialfileid/view'})};
 try{await assert.rejects(()=>loader()('lib/upload-client.ts').uploadFile(new File(['abc'],'work.txt',{type:'text/plain'})),/position|incomplete|acknowledge/i);assert.equal(finish,0)}finally{global.fetch=previous}
});

test('finish cannot register a different Drive file from the signed upload session',async()=>{
 const previous=global.fetch,oldUrl=process.env.APPS_SCRIPT_UPLOAD_URL;process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';let writes=0;
 const load=loader({'@/lib/auth':{verifyAdminSession:async()=>true,getStudentSession:async()=>null},'@/lib/db':{execute:async()=>{writes++},queryOne:async()=>null},'@/lib/storage-config':{getStorageSecret:async()=>'secret'},'next/server':{NextResponse:Response}}),route=load('app/api/upload/route.ts'),{signUpload}=load('lib/upload-authority.ts');
 const ticket=signUpload({fileId:'intendedfileid',actor:'admin',expires:Date.now()+10000},'secret');global.fetch=async()=>Response.json({version:2,success:true,created:true,fileId:'differentfileid',fileUrl:'https://drive.google.com/file/d/differentfileid/view',fileName:'wrong.pdf'});
 try{const request=new Request('https://app.test/api/upload',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({action:'finish',ticket,fileName:'expected.pdf'})});const r=await route.POST(request);assert.equal(r.status,502);assert.equal(writes,0);const recovered=await load('app/api/upload/recent/route.ts').POST(new Request('https://app.test/api/upload/recent',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({fileId:'intendedfileid'})}));assert.equal(recovered.status,502);assert.equal(writes,0)}finally{global.fetch=previous;if(oldUrl===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=oldUrl}
});

test('replaying a signed upload object as the pending-files cookie cannot crash file reads or future uploads',()=>{
 const {signUpload,pendingFiles}=loader()('lib/upload-authority.ts');const ticket=signUpload({fileId:'ownpendingfile',actor:'admin',expires:Date.now()+10000,uploadUrl:'https://www.googleapis.com/upload/drive/v3/files'},'secret');
 assert.deepEqual(pendingFiles(new Headers({Cookie:'tuition_pending_files='+ticket}),'secret'),[]);
});

test('finish retries are bounded and expired credentials are not retried',async()=>{
 const previous=global.fetch;
 try{for(const status of[503,401]){let finish=0;global.fetch=async(url,options)=>{if(url==='/api/upload/chunk')return Response.json({complete:true,nextOffset:3});if(JSON.parse(options.body).action==='begin')return Response.json({ticket:'signed'});finish++;return Response.json({error:status===401?'Sign in again':'Temporary unavailable'},{status})};await assert.rejects(()=>loader()('lib/upload-client.ts').uploadFile(new File(['abc'],'work.txt',{type:'text/plain'})),/Sign in|Temporary/);assert.equal(finish,status===503?3:1)}}finally{global.fetch=previous}
});

test('private range requests reject invalid ranges before transferring payloads and honor pre-aborted clients',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuition-file-cancel-')),oldUrl=process.env.TURSO_DATABASE_URL,oldConnector=process.env.APPS_SCRIPT_UPLOAD_URL,previous=global.fetch;
 process.env.TURSO_DATABASE_URL='file:'+path.join(dir,'db.sqlite');process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';let reads=0;
 const load=loader({'@/lib/auth':{verifyAdminSession:async()=>true,getStudentSession:async()=>null},'@/lib/storage-config':{getStorageSecret:async()=>'secret'},'next/server':{NextResponse:Response}}),db=load('lib/db.ts');
 try{await db.ensureMigrated();global.fetch=async(_url,options)=>{if(options.signal.aborted)throw new DOMException('Aborted','AbortError');reads++;const p=JSON.parse(options.body);return Response.json({version:2,success:true,total:100,nextOffset:p.offset+1,base64:'QQ==',fileName:'file.pdf',mimeType:'application/pdf'})};const route=load('app/api/files/[fileId]/route.ts'),params={params:Promise.resolve({fileId:'stressrangefile'})};
 for(const range of['bytes=100-','bytes=12-3','bytes=-0','bytes=0-1,3-4','bytes=9007199254740993-']){const r=new Request('https://app.test/api/files/stressrangefile?inline=1',{headers:{Range:range}});r.nextUrl=new URL(r.url);assert.equal((await route.GET(r,params)).status,416)}
 const before=reads,abort=new AbortController();abort.abort();const r=new Request('https://app.test/api/files/stressrangefile?inline=1',{method:'HEAD',signal:abort.signal});r.nextUrl=new URL(r.url);await route.HEAD(r,params);assert.equal(reads,before,'an already closed client must not start a provider read');
 }finally{db.getClient().close();global.fetch=previous;if(oldUrl===undefined)delete process.env.TURSO_DATABASE_URL;else process.env.TURSO_DATABASE_URL=oldUrl;if(oldConnector===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=oldConnector;fs.rmSync(dir,{recursive:true,force:true})}
});

test('malformed upload JSON is a client error and never calls storage',async()=>{const previousUrl=process.env.APPS_SCRIPT_UPLOAD_URL;process.env.APPS_SCRIPT_UPLOAD_URL='https://connector.test';try{const route=loader({'next/server':{NextResponse:Response},'@/lib/auth':{verifyAdminSession:async()=>true,getStudentSession:async()=>null},'@/lib/storage-config':{getStorageSecret:async()=>'secret'}})('app/api/upload/route.ts');for(const body of ['{', 'null','[]','true']){const r=await route.POST(new Request('https://app.test/api/upload',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body}));assert.equal(r.status,400)}}finally{if(previousUrl===undefined)delete process.env.APPS_SCRIPT_UPLOAD_URL;else process.env.APPS_SCRIPT_UPLOAD_URL=previousUrl}});

test('Drive recovery rejects malformed request bodies without contacting storage or writing metadata', async () => {
  const previous = global.fetch;
  let calls = 0;
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/auth': { verifyAdminSession: async () => true },
    '@/lib/db': { execute: async () => { calls++; throw Error('Unexpected write'); } },
    '@/lib/storage-config': { getStorageSecret: async () => { calls++; throw Error('Unexpected storage call'); } },
  })('app/api/upload/recent/route.ts');
  global.fetch = async () => { calls++; throw Error('Unexpected fetch'); };
  try {
    for (const body of ['{', 'null', '[]', 'true', '"text"', '{}', '{"fileId":12}']) {
      const response = await route.POST(new Request('https://app.test/api/upload/recent', {
        method: 'POST', headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' }, body,
      }));
      assert.equal(response.status, 400);
    }
    assert.equal(calls, 0);
  } finally { global.fetch = previous; }
});
