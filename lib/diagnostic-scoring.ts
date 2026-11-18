import 'server-only';
import {ACTION_TEMPLATES,DIAGNOSTIC_VERSION,RISK_RULES,STRANDS,STRAND_ORDER,type DiagnosticBankQuestion,type DiagnosticBank} from './diagnostic-bank';
import type {DiagnosticAnswers,DiagnosticBand,DiagnosticProfile,DiagnosticQuestion,DiagnosticReport,DiagnosticStrand,DiagnosticTier} from './diagnostic-types';
const TIERS:DiagnosticTier[]=['asas','mid','adv'];
export function diagnosticBand(pct:number):DiagnosticBand {
  if(pct<40)return {key:'not-ready',label_bm:'Belum Bersedia',label_en:'Not Yet Ready'};
  if(pct<60)return {key:'emerging',label_bm:'Asas Berkembang',label_en:'Emerging'};
  if(pct<80)return {key:'ready',label_bm:'Bersedia',label_en:'Ready'};
  return {key:'strong',label_bm:'Cemerlang',label_en:'Strong'};
}
export function checkDiagnosticAnswer(item:DiagnosticBankQuestion,raw:unknown):boolean {
  if(raw===null||raw===undefined||String(raw).trim()==='')return false;
  if(item.type==='mcq'||item.type==='flowchart')return raw===item.correct;
  if(item.type==='numeric') {
    const value=String(raw).trim();
    // Number/parseFloat must not accept a partial answer such as "17abc" or hexadecimal.
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return false;
    const n=Number(value);return Number.isFinite(n)&&typeof item.correct==='number'&&Math.abs(n-item.correct)<0.01;
  }
  if(item.type==='text')return Array.isArray(item.correct)&&item.correct.some(answer=>answer.trim().toLowerCase()===String(raw).trim().toLowerCase());
  return false;
}
export function normalizeDiagnosticAnswers(input:unknown,questions:DiagnosticQuestion[]):DiagnosticAnswers {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Diagnostic answers must be an object');
  const entries=Object.entries(input);if(entries.length>questions.length)throw new Error('Too many diagnostic answers');
  const byCode=new Map(questions.map(q=>[q.code,q])),out:DiagnosticAnswers={};
  for(const [code,answer] of entries) {
    const item=byCode.get(code);if(!item)throw new Error('Unknown diagnostic question');
    if(!answer||typeof answer!=='object'||Array.isArray(answer))throw new Error('Invalid diagnostic answer');
    const data=answer as {value?:unknown;ms?:unknown};
    let value=data.value===undefined?null:data.value;
    if(value!==null&&typeof value!=='string'&&typeof value!=='number')throw new Error('Invalid diagnostic answer value');
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Invalid diagnostic answer value');
    if(typeof value==='string'){const trimmed=value.trim();if(trimmed.length>500)throw new Error('Diagnostic answer is too long');value=trimmed||null;}
    if(value!==null&&(item.type==='choice'||item.type==='mcq'||item.type==='flowchart')&&!item.options?.some(o=>o.id===value))throw new Error('Choose an available diagnostic option');
    if(value!==null&&item.type==='likert'){const n=Number(value);if(!Number.isInteger(n)||n<1||n>5)throw new Error('Choose a rating from 1 to 5');value=n;}
    const rawMs=data.ms??0;if(typeof rawMs!=='number'||!Number.isFinite(rawMs)||rawMs<0)throw new Error('Invalid diagnostic timing');
    out[code]={value:value as string|number|null,ms:Math.min(3600000,Math.round(rawMs))};
  }
  return out;
}
const PROFILES:Record<DiagnosticProfile,DiagnosticReport['profileLabel']>={
  quick:{icon:'⭐',bm:'Pemikir Pantas',en:'Quick Thinker',bm_d:'Menjawab pantas dan tepat — sedia untuk cabaran lebih tinggi.',en_d:'Answers quickly and accurately — ready for greater challenges.'},
  impulsive:{icon:'⚡',bm:'Impulsif',en:'Impulsive',bm_d:'Menjawab pantas tetapi kurang tepat — perlu perlahan dan baca teliti.',en_d:'Fast but inaccurate — needs to slow down and read carefully.'},
  careful:{icon:'🐢',bm:'Teliti tapi Lambat',en:'Careful but Slow',bm_d:'Tepat tetapi mengambil masa — mungkin kurang keyakinan.',en_d:'Accurate but slow — may lack confidence.'},
  struggling:{icon:'🤝',bm:'Perlukan Sokongan',en:'Needs Support',bm_d:'Lambat dan kurang tepat — perlukan bimbingan asas yang lebih mendalam.',en_d:'Slow and inaccurate — needs deeper foundational guidance.'},
  balanced:{icon:'👍',bm:'Seimbang',en:'Balanced',bm_d:'Masa dan ketepatan pada tahap biasa.',en_d:'Speed and accuracy at normal levels.'},
};
const percent=(correct:number,total:number)=>total?Math.round(100*correct/total):0;
export function computeDiagnosticReport(input:DiagnosticAnswers,snapshot:DiagnosticBank):DiagnosticReport {
  const items=snapshot.items,version=snapshot.version;
  const answers=normalizeDiagnosticAnswers(input,items),skills=items.filter((q):q is DiagnosticBankQuestion & {strand:DiagnosticStrand;tier:DiagnosticTier}=>!!q.strand&&!!q.tier);
  const background=items.filter(q=>!q.strand);
  const strandScores={} as DiagnosticReport['strandScores'],strandPct={} as DiagnosticReport['strandPct'];
  const tierScores={} as DiagnosticReport['tierScores'],tierPct={} as DiagnosticReport['tierPct'],tierByStrandPct={} as DiagnosticReport['tierByStrandPct'];
  const status=(code:string)=>{const a=answers[code],item=items.find(q=>q.code===code)!;return a?.value===null||!a?'skipped':checkDiagnosticAnswer(item,a.value)?'correct':'incorrect'};
  for(const strand of STRAND_ORDER){const questions=skills.filter(q=>q.strand===strand),correct=questions.filter(q=>status(q.code)==='correct').length;strandScores[strand]={correct,total:questions.length,percent:percent(correct,questions.length)};strandPct[strand]=strandScores[strand].percent;tierByStrandPct[strand]={asas:0,mid:0,adv:0};for(const tier of TIERS){const qs=questions.filter(q=>q.tier===tier);tierByStrandPct[strand][tier]=percent(qs.filter(q=>status(q.code)==='correct').length,qs.length)}}
  for(const tier of TIERS){const qs=skills.filter(q=>q.tier===tier),correct=qs.filter(q=>status(q.code)==='correct').length;tierScores[tier]={correct,total:qs.length,percent:percent(correct,qs.length)};tierPct[tier]=tierScores[tier].percent}
  const totalCorrect=skills.filter(q=>status(q.code)==='correct').length,overallPct=percent(totalCorrect,skills.length),answeredCount=skills.filter(q=>status(q.code)!=='skipped').length;
  const bg=(code:string)=>answers[code]?.value??null;
  const confidence=bg('BG2')===null?null:Number(bg('BG2')),interest=bg('BG3')===null?null:Number(bg('BG3'));
  const confidencePct=confidence!==null&&interest!==null?Math.round(100*((confidence+interest)/2-1)/4):null;
  const bg1Label=background.find(q=>q.code==='BG1')?.options?.find(o=>o.id===bg('BG1'))??null;
  let gapFlag:DiagnosticReport['gapFlag']=null;
  if(confidencePct!==null){
    if(confidencePct>=70&&overallPct<50)gapFlag={icon:'⚠️',bm:'Yakin tetapi kemahiran masih lemah — elakkan andaian kesediaan.',en:'Confident but skills still weak — avoid assuming readiness.'};
    else if(confidencePct<=40&&overallPct>=60)gapFlag={icon:'💡',bm:'Kemahiran baik tetapi keyakinan rendah — beri pengukuhan positif.',en:'Skills are good but confidence is low — give positive reinforcement.'};
    else gapFlag={icon:'✅',bm:'Keyakinan sejajar dengan kemahiran.',en:'Confidence aligned with skills.'};
  }
  const allTimes=skills.map(q=>answers[q.code]?.ms).filter((ms):ms is number=>ms!==undefined&&ms>0),avg=allTimes.reduce((sum,ms)=>sum+ms,0)/(allTimes.length||1),avgSec=avg/1000,timingAvailable=allTimes.length>0;
  let profile:DiagnosticProfile='balanced';
  if(timingAvailable){if(avgSec<45&&overallPct>=60)profile='quick';else if(avgSec<45&&overallPct<60)profile='impulsive';else if(avgSec>=75&&overallPct>=60)profile='careful';else if(avgSec>=75&&overallPct<60)profile='struggling'}
  const recsByStrand={CT:[],DR:[],AL:[],PR:[]} as DiagnosticReport['recsByStrand'];
  for(const q of skills)if(status(q.code)!=='correct')recsByStrand[q.strand].push({bm:q.tip_bm||'',en:q.tip_en||''});
  const risks:DiagnosticReport['risks']=[];
  for(const rule of RISK_RULES){const pct=percent(rule.items.filter(code=>status(code)==='correct').length,rule.items.length),level=pct<rule.thresh?'high':pct<75?'moderate':'ok';if(level!=='ok')risks.push({...rule,pct,level})}
  risks.sort((a,b)=>a.priority-b.priority);const riskIds=risks.filter(r=>r.level==='high').map(r=>r.id);
  const pacingFlags:DiagnosticReport['pacingFlags']=[];
  if(timingAvailable)for(const strand of STRAND_ORDER){const times=skills.filter(q=>q.strand===strand).map(q=>answers[q.code]?.ms).filter((ms):ms is number=>ms!==undefined&&ms>0);if(!times.length)continue;const mean=times.reduce((sum,ms)=>sum+ms,0)/times.length;
    if(strandPct[strand]<60&&mean>avg*1.4)pacingFlags.push({strand,icon:'🐢',bm:`Lambat pada ${STRANDS[strand].name_bm} — mungkin perlukan bimbingan tambahan.`,en:`Slow on ${STRANDS[strand].name_en} — may need extra guidance.`});
    else if(strandPct[strand]<60&&mean<avg*0.6)pacingFlags.push({strand,icon:'⚡',bm:`Pantas tetapi salah pada ${STRANDS[strand].name_bm} — mungkin meneka.`,en:`Fast but wrong on ${STRANDS[strand].name_en} — may be guessing.`});
  }
  const conditions:Record<string,boolean>={math:strandPct.DR<50,instructions:strandPct.AL<50,logic:strandPct.CT<50,variables:strandPct.PR<50,impulsive:profile==='impulsive',careful:profile==='careful',boolean:riskIds.includes('boolean'),loops:riskIds.includes('loops')};
  const actions=ACTION_TEMPLATES.filter(a=>conditions[a.condition]).sort((a,b)=>a.priority-b.priority).slice(0,3).map(({condition,...action})=>action);
  const qlog:DiagnosticReport['qlog']=items.map(q=>{const answer=answers[q.code],state=!q.strand?(answer?.value===null||!answer?'skipped':'answered'):status(q.code);let studentAnswer:string|number=state==='skipped'?'Dilangkau':answer?.value??'—';let correctAnswer:string|number|null=Array.isArray(q.correct)?q.correct[0]:q.correct??null;
    if(q.type==='choice'||q.type==='mcq'||q.type==='flowchart'){studentAnswer=q.options?.find(o=>o.id===answer?.value)?.bm??studentAnswer;correctAnswer=q.options?.find(o=>o.id===q.correct)?.bm??correctAnswer}
    return {code:q.code,strand:q.strand??null,tier:q.tier??null,rawAnswer:answer?.value??null,question:q.bm,question_en:q.en,status:state,studentAnswer,correctAnswer,ms:answer?.ms??0};});
  const values=Object.values(strandPct),max=Math.max(...values),min=Math.min(...values);
  return {version,totalQuestions:skills.length,totalCorrect,answeredCount,skippedCount:skills.length-answeredCount,overallPct,band:diagnosticBand(overallPct),strandScores,strandPct,tierScores,tierPct,tierByStrandPct,background:{experience:bg1Label,confidence,interest},confidencePct,confidenceInterestPct:confidencePct,backgroundCompositeLabel:'Combined self-reported confidence and interest',bg1Label,gapFlag,profile,profileLabel:timingAvailable?PROFILES[profile]:{icon:'ℹ️',bm:'Masa tidak tersedia',en:'Timing unavailable',bm_d:'Tiada kesimpulan tentang kadar menjawab tanpa data masa.',en_d:'No pacing inference is made without timing data.'},strengths:STRAND_ORDER.filter(s=>strandPct[s]===max),growth:STRAND_ORDER.filter(s=>strandPct[s]===min),recsByStrand,risks,riskIds,pacingFlags,actions,qlog,totalMs:items.reduce((sum,q)=>sum+(answers[q.code]?.ms??0),0),timingAvailable,timingNotice:'Pacing is a teaching hint based on browser-reported time, not a verified measure of ability or attention.'};
}
