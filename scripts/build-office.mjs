import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {cp,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
if(!process.argv.includes('--skip-install'))execFileSync('npm',['ci','--prefix','office-editor','--ignore-scripts','--include=dev','--no-audit','--no-fund'],{stdio:'inherit'});
execFileSync('npm',['run','build','--prefix','office-editor'],{stdio:'inherit'});
await mkdir('public/office-editor/sheets',{recursive:true});
await cp('office-editor/node_modules/@schnsrw/core/wasm/s1engine_wasm_bg.wasm','public/office-editor/assets/s1engine_wasm_bg.wasm');
const base='office-editor/node_modules/@casualoffice/sheets/dist/embed';
for(const name of ['embed-runtime.js','parser.worker.js','formula.worker.js','exporter.worker.js']){let source=await readFile(`${base}/${name}`,'utf8');source=source.replace(/https:\/\/fonts\.googleapis\.com\/[^"'\s]+/g,'/office-editor/fonts.css');await writeFile(`public/office-editor/sheets/${name}`,source);}
await cp('office-editor/node_modules/@fontsource-variable/material-symbols-outlined/files/material-symbols-outlined-latin-wght-normal.woff2','public/office-editor/symbols.woff2');
const fonts="@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;font-display:swap;src:url('/office-editor/symbols.woff2') format('woff2')}";await writeFile('public/office-editor/fonts.css',fonts);
for(const name of await readdir('public/office-editor/assets'))if(name.endsWith('.css')){const file='public/office-editor/assets/'+name;let css=await readFile(file,'utf8');css=css.replace(/@import\s*(?:url\()?[^;]*fonts\.googleapis[^;]*;/g,'');await writeFile(file,fonts+css);}
await writeFile('public/office-editor/sheets/embed.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#editor{height:100%;margin:0;overflow:hidden}</style></head><body><div id="editor"></div><script type="module">import{mountEmbedded}from"./embed-runtime.js";mountEmbedded({root:document.getElementById("editor")});</script></body></html>');
await mkdir('public/office-editor/licenses',{recursive:true});
await cp('office-editor/licenses','public/office-editor/licenses',{recursive:true});
await cp('office-editor/node_modules/@fontsource-variable/material-symbols-outlined/LICENSE','public/office-editor/licenses/material-symbols-LICENSE');
for(const name of ['docs','sheets']){for(const file of ['LICENSE','NOTICE'])try{await cp(`office-editor/node_modules/@casualoffice/${name}/${file}`,`public/office-editor/licenses/${name}-${file}`)}catch{}}
await writeFile('public/office-editor/licenses/README.txt','Docs: CasualOffice/docs 1.4.2. Legacy and view-only sheets: CasualOffice/sheets 0.20.0. New editable sheets: Gridcraft 0.19.1 (MIT OR Apache-2.0); its licences and notices are under ../gridcraft/. Retained upstream MIT/Apache attributions apply. See https://github.com/CasualOffice/docs and https://github.com/CasualOffice/sheets. No AI integrations or live collaboration enabled.');

// Vendor the verified browser release: no Rust toolchain or build-time CDN dependency.
const archive=await readFile('office-editor/vendor/gridcraft-web-0.19.1.zip');
if(createHash('sha256').update(archive).digest('hex')!=='48c5d1b101befebb3c5ba3b7a14914f01c3207934813ed07dc4251b7ae116a78')throw new Error('Gridcraft archive checksum mismatch');
const require=createRequire(import.meta.url),JSZip=require('../office-editor/node_modules/jszip');
const zip=await JSZip.loadAsync(archive),prefix='gridcraft-web-0.19.1/';
for(const [name,entry] of Object.entries(zip.files)){
  if(entry.dir||!name.startsWith(prefix))continue;
  const relative=name.slice(prefix.length);
  if(relative.split('/').includes('..')||relative.startsWith('/'))throw new Error('Unsafe Gridcraft archive path');
  const destination='public/office-editor/gridcraft/'+relative;
  await mkdir(destination.slice(0,destination.lastIndexOf('/')),{recursive:true});
  await writeFile(destination,await entry.async('nodebuffer'));
}
