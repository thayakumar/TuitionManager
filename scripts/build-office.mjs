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
await writeFile('public/office-editor/licenses/README.txt','Editors: CasualOffice/docs 1.4.2 and CasualOffice/sheets 0.20.0. Apache-2.0 with retained upstream MIT/Apache attributions. See https://github.com/CasualOffice/docs and https://github.com/CasualOffice/sheets. No AI integrations or live collaboration enabled.');
