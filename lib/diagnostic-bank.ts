import 'server-only';
import {queryOne} from './db';
import type {DiagnosticQuestion,DiagnosticStrand} from './diagnostic-types';
/** Answer keys and original questions are imported into a private database template, never source control. */
export const DIAGNOSTIC_VERSION='ask-readiness-v3';
export type DiagnosticBankQuestion=DiagnosticQuestion & {correct?:string|number|string[];tip_bm?:string;tip_en?:string};
export type DiagnosticBank={version:string;items:DiagnosticBankQuestion[]};
export const STRAND_ORDER:DiagnosticStrand[]=['CT','DR','AL','PR'];
export const STRANDS = {
  "CT": {
    "name_bm": "Pemikiran Komputasional",
    "name_en": "Computational Thinking",
    "color": "--cyan",
    "colorD": "--cyan-d",
    "bidang": "Bidang 1"
  },
  "DR": {
    "name_bm": "Perwakilan Data",
    "name_en": "Data Representation",
    "color": "--amber",
    "colorD": "--amber-d",
    "bidang": "Bidang 2"
  },
  "AL": {
    "name_bm": "Algoritma",
    "name_en": "Algorithms",
    "color": "--coral",
    "colorD": "--coral-d",
    "bidang": "Bidang 3"
  },
  "PR": {
    "name_bm": "Pengaturcaraan",
    "name_en": "Programming",
    "color": "--violet",
    "colorD": "--violet-d",
    "bidang": "Bidang 4"
  }
};
export const RISK_RULES = [
  {
    "id": "binary",
    "items": [
      "DR1",
      "DR2",
      "DR5",
      "DR8"
    ],
    "thresh": 50,
    "icon": "🔢",
    "priority": 1,
    "bm": "Bab 2: Nombor Perduaan (Binary) — asas nilai tempat dan kuasa 2 perlu diperkukuh.",
    "en": "Ch 2: Binary Numbers — place value and powers-of-2 foundations need strengthening."
  },
  {
    "id": "units",
    "items": [
      "DR3",
      "DR4"
    ],
    "thresh": 50,
    "icon": "📏",
    "priority": 2,
    "bm": "Bab 2: Penukaran Unit Data (bit/bait/KB/MB) — penukaran unit dua-langkah masih lemah.",
    "en": "Ch 2: Data Unit Conversion (bit/byte/KB/MB) — multi-step unit conversion still weak."
  },
  {
    "id": "ascii",
    "items": [
      "DR6",
      "DR7"
    ],
    "thresh": 50,
    "icon": "🔤",
    "priority": 2,
    "bm": "Bab 2: Kod ASCII & T3 Kriptografi — padanan simbol-ke-makna perlu dilatih.",
    "en": "Ch 2: ASCII Codes & Yr3 Cryptography — symbol-to-meaning mapping needs practice."
  },
  {
    "id": "baseconv",
    "items": [
      "DR8"
    ],
    "thresh": 100,
    "icon": "🌐",
    "priority": 3,
    "bm": "T2: Nombor Oktal/Heksadesimal — penukaran asas nombor belum kukuh.",
    "en": "Yr2: Octal/Hexadecimal — multi-base number conversion not yet solid."
  },
  {
    "id": "decomp",
    "items": [
      "CT1",
      "CT4"
    ],
    "thresh": 50,
    "icon": "🧩",
    "priority": 1,
    "bm": "Bab 1: Leraian & Pengitlakan — pecahan tugas besar kepada langkah kecil perlu dilatih.",
    "en": "Ch 1: Decomposition & Generalization — breaking big tasks into steps needs practice."
  },
  {
    "id": "pattern",
    "items": [
      "CT2",
      "CT3"
    ],
    "thresh": 50,
    "icon": "🔁",
    "priority": 2,
    "bm": "Bab 1: Pengecaman Corak — kenal pasti corak nombor dan visual perlu diperkukuh.",
    "en": "Ch 1: Pattern Recognition — identifying number and visual patterns needs strengthening."
  },
  {
    "id": "boolean",
    "items": [
      "CT5",
      "CT6",
      "PR8"
    ],
    "thresh": 34,
    "icon": "⚡",
    "priority": 1,
    "bm": "T2+: Operator Boolean & Syarat Berganda — logik DAN/ATAU perlu dibina dari asas.",
    "en": "Yr2+: Boolean Operators & Multi-conditions — AND/OR logic needs building from scratch."
  },
  {
    "id": "flowchart",
    "items": [
      "AL3",
      "AL5"
    ],
    "thresh": 50,
    "icon": "📊",
    "priority": 1,
    "bm": "Bab 3: Carta Alir & Struktur Pilihan — membaca percabangan keputusan perlu dibimbing.",
    "en": "Ch 3: Flowcharts & Selection Structures — reading decision branches needs guidance."
  },
  {
    "id": "loops",
    "items": [
      "AL4",
      "AL6"
    ],
    "thresh": 50,
    "icon": "🔄",
    "priority": 1,
    "bm": "Bab 3: Struktur Ulangan (Loop) — konsep pengulangan masih lemah.",
    "en": "Ch 3: Loop Structures — repetition concept still weak."
  },
  {
    "id": "pseudo",
    "items": [
      "AL1",
      "AL7",
      "AL8"
    ],
    "thresh": 34,
    "icon": "📝",
    "priority": 2,
    "bm": "Bab 3: Menulis Pseudokod — ikutan arahan tepat dan pengesanan ralat perlu diperkukuh.",
    "en": "Ch 3: Writing Pseudocode — precise instruction-following and error detection need strengthening."
  },
  {
    "id": "variable",
    "items": [
      "PR1",
      "PR5",
      "PR6"
    ],
    "thresh": 34,
    "icon": "📦",
    "priority": 1,
    "bm": "Bab 4: Pemboleh Ubah & Pengaturcaraan — konsep storan dan jejak nilai masih lemah.",
    "en": "Ch 4: Variables & Programming — storage concept and value tracing still weak."
  },
  {
    "id": "debug",
    "items": [
      "PR4",
      "PR7",
      "AL8"
    ],
    "thresh": 34,
    "icon": "🐛",
    "priority": 2,
    "bm": "T2+: Penyahpepijatan (Debugging) — ketelitian membaca kod perlu dipertingkatkan.",
    "en": "Yr2+: Debugging — code-reading precision needs improvement."
  },
  {
    "id": "vocab",
    "items": [
      "PR3",
      "PR2"
    ],
    "thresh": 50,
    "icon": "🗣️",
    "priority": 3,
    "bm": "Bab 4: Istilah Pengaturcaraan — kosa kata CS Inggeris perlu diperkenalkan awal.",
    "en": "Ch 4: Programming Terminology — English CS vocabulary needs early introduction."
  }
];
export const ACTION_TEMPLATES = [
  {
    "priority": 1,
    "bm": "📐 Perkukuh Asas Matematik",
    "bm_d": "Latih nilai tempat, operasi asas tanpa kalkulator, dan penukaran unit melalui aktiviti hands-on (blok Dienes, duit kertas) sebelum memulakan Bab 2.",
    "en": "Strengthen Math Foundations",
    "en_d": "Drill place value, calculator-free arithmetic, and unit conversion via hands-on activities before starting Chapter 2.",
    "condition": "math"
  },
  {
    "priority": 1,
    "bm": "🔄 Bina Pemahaman Arahan",
    "bm_d": "Mula dengan aktiviti fizikal (tepuk-lompat, robot manusia) untuk membina kefahaman urutan dan ulangan sebelum pseudokod bertulis.",
    "en": "Build Instruction Understanding",
    "en_d": "Start with physical activities (clap-jump, human robot) to build sequence and loop understanding before written pseudocode.",
    "condition": "instructions"
  },
  {
    "priority": 1,
    "bm": "🧩 Latih Pemikiran Logik Harian",
    "bm_d": "Gunakan teka-teki, permainan susun langkah, dan aktiviti klasifikasi dalam kehidupan harian untuk membina pemikiran komputasional.",
    "en": "Train Everyday Logical Thinking",
    "en_d": "Use puzzles, step-ordering games, and daily classification activities to build computational thinking.",
    "condition": "logic"
  },
  {
    "priority": 1,
    "bm": "📦 Perkenalkan Pemboleh Ubah Secara Konkrit",
    "bm_d": "Gunakan \"kotak bernama\" fizikal (kotak kasut berlabel) untuk menunjukkan konsep pemboleh ubah sebelum beralih ke kod.",
    "en": "Introduce Variables Concretely",
    "en_d": "Use physical \"named boxes\" (labeled shoeboxes) to demonstrate the variable concept before moving to code.",
    "condition": "variables"
  },
  {
    "priority": 2,
    "bm": "✋ Ajar Kaedah \"Baca Dua Kali\"",
    "bm_d": "Murid ini menjawab pantas tetapi kurang tepat. Ajar teknik membaca soalan dua kali dan menanda setiap syarat sebelum menjawab.",
    "en": "Teach the \"Read Twice\" Method",
    "en_d": "This student answers fast but inaccurately. Teach reading questions twice and checking off each condition before answering.",
    "condition": "impulsive"
  },
  {
    "priority": 2,
    "bm": "💪 Beri Lebih Pengukuhan Positif",
    "bm_d": "Murid ini teliti tetapi lambat — mungkin kurang keyakinan. Beri maklum balas positif segera dan peluang kejayaan kecil yang kerap.",
    "en": "Give More Positive Reinforcement",
    "en_d": "This student is careful but slow — may lack confidence. Give immediate positive feedback and frequent small wins.",
    "condition": "careful"
  },
  {
    "priority": 2,
    "bm": "⚡ Perkenalkan Logik DAN/ATAU Awal",
    "bm_d": "Gunakan permainan \"Jika...Maka...\" setiap awal kelas — situasi harian dengan dua syarat untuk membina asas Boolean.",
    "en": "Introduce AND/OR Logic Early",
    "en_d": "Use \"If...Then...\" games at the start of each class — everyday situations with two conditions to build Boolean foundations.",
    "condition": "boolean"
  },
  {
    "priority": 2,
    "bm": "🎯 Fokus Gelung Melalui Aktiviti Fizikal",
    "bm_d": "Minta murid melakukan arahan berulang (3× tepuk, lompat) sebelum memperkenalkan pseudokod ULANG — pengalaman badan mendahului abstraksi.",
    "en": "Focus Loops Through Physical Activity",
    "en_d": "Have students perform repeated instructions (3× clap, jump) before introducing REPEAT pseudocode — body experience before abstraction.",
    "condition": "loops"
  }
];
function text(value:unknown,label:string,max=8000):string {if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid diagnostic '+label);return value}
export function validateDiagnosticBank(input:unknown):DiagnosticBank {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid diagnostic template');
  const raw=input as {version?:unknown;items?:unknown};
  if(raw.version!==DIAGNOSTIC_VERSION||!Array.isArray(raw.items)||raw.items.length!==35)throw new Error('Import the 35-question ASK v3 template');
  const expected=['BG1','BG2','BG3',...Array.from({length:8},(_,i)=>STRAND_ORDER.map(s=>s+(i+1))).flat()];
  const items:DiagnosticBankQuestion[]=raw.items.map((input,index)=>{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid diagnostic question');
    const q=input as Record<string,unknown>;if(q.code!==expected[index])throw new Error('Diagnostic question order does not match ASK v3');
    const code=String(q.code),type=q.type as DiagnosticQuestion['type'],background=code.startsWith('BG');
    const allowed=background?(code==='BG1'?['choice']:['likert']):['mcq','numeric','flowchart','text'];
    if(!allowed.includes(type))throw new Error('Invalid diagnostic question type');
    const clean:DiagnosticBankQuestion={code,type,bm:text(q.bm,'question'),en:text(q.en,'question')};
    if(['choice','mcq','flowchart'].includes(type)){
      if(!Array.isArray(q.options)||q.options.length<2||q.options.length>8)throw new Error('Invalid diagnostic choices');
      clean.options=q.options.map(o=>{if(!o||typeof o!=='object')throw new Error('Invalid diagnostic option');const opt=o as Record<string,unknown>;return{id:text(opt.id,'option ID',10),bm:text(opt.bm,'option'),en:text(opt.en,'option')}});
      if(new Set(clean.options.map(o=>o.id)).size!==clean.options.length)throw new Error('Duplicate diagnostic option');
    }
    if(!background){
      const strand=code.slice(0,2) as DiagnosticStrand;if(q.strand!==strand||!['asas','mid','adv'].includes(String(q.tier)))throw new Error('Invalid diagnostic strand or tier');
      clean.strand=strand;clean.tier=q.tier as DiagnosticQuestion['tier'];
      if(type==='numeric'){if(typeof q.correct!=='number'||!Number.isFinite(q.correct))throw new Error('Invalid numeric diagnostic key');clean.correct=q.correct}
      else if(type==='text'){if(!Array.isArray(q.correct)||!q.correct.length||q.correct.length>20)throw new Error('Invalid text diagnostic key');clean.correct=q.correct.map(a=>text(a,'text key',500))}
      else{if(typeof q.correct!=='string'||!clean.options?.some(o=>o.id===q.correct))throw new Error('Invalid choice diagnostic key');clean.correct=q.correct}
      clean.tip_bm=text(q.tip_bm,'recommendation',3000);clean.tip_en=text(q.tip_en,'recommendation',3000);
    }
    return clean;
  });
  return {version:DIAGNOSTIC_VERSION,items};
}
export async function loadDiagnosticBank(version=DIAGNOSTIC_VERSION):Promise<DiagnosticBank|null> {
  const row=await queryOne<{data_json:string}>('SELECT data_json FROM diagnostic_templates WHERE version=?',[version]);
  return row?validateDiagnosticBank(JSON.parse(row.data_json)):null;
}
export function publicQuestions(bank:DiagnosticBank):DiagnosticQuestion[] {
  return bank.items.map(({code,type,bm,en,strand,tier,options})=>({code,type,bm,en,...(strand?{strand}:{}),...(tier?{tier}:{}),...(options?{options:options.map(o=>({...o}))}:{})}));
}
