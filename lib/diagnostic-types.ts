/** Public diagnostic DTOs. This file intentionally contains no answer keys. */
export type DiagnosticStrand = 'CT' | 'DR' | 'AL' | 'PR';
export type DiagnosticTier = 'asas' | 'mid' | 'adv';
export type DiagnosticQuestion = {
  code:string; type:'choice'|'likert'|'mcq'|'numeric'|'flowchart'|'text';
  bm:string; en:string; strand?:DiagnosticStrand; tier?:DiagnosticTier;
  options?:{id:string;bm:string;en:string}[];
};
export type DiagnosticAnswer = {value:string|number|null;ms:number};
export type DiagnosticAnswers = Record<string,DiagnosticAnswer>;
export type DiagnosticBilingual = {bm:string;en:string};
export type DiagnosticBand = {key:'not-ready'|'emerging'|'ready'|'strong';label_bm:string;label_en:string};
export type DiagnosticProfile = 'quick'|'impulsive'|'careful'|'struggling'|'balanced';
export type DiagnosticRisk = DiagnosticBilingual & {id:string;items:string[];thresh:number;icon:string;priority:number;pct:number;level:'high'|'moderate'};
export type DiagnosticReport = {
  version:string;totalQuestions:number;totalCorrect:number;answeredCount:number;skippedCount:number;
  overallPct:number;band:DiagnosticBand;
  strandScores:Record<DiagnosticStrand,{correct:number;total:number;percent:number}>;
  strandPct:Record<DiagnosticStrand,number>;
  tierScores:Record<DiagnosticTier,{correct:number;total:number;percent:number}>;
  tierPct:Record<DiagnosticTier,number>;
  tierByStrandPct:Record<DiagnosticStrand,Record<DiagnosticTier,number>>;
  background:{experience:DiagnosticBilingual|null;confidence:number|null;interest:number|null};
  confidencePct:number|null;confidenceInterestPct:number|null;backgroundCompositeLabel:string;bg1Label:({id:string}&DiagnosticBilingual)|null;
  gapFlag:(DiagnosticBilingual&{icon:string})|null;
  profile:DiagnosticProfile;profileLabel:DiagnosticBilingual&{icon:string;bm_d:string;en_d:string};
  strengths:DiagnosticStrand[];growth:DiagnosticStrand[];
  recsByStrand:Record<DiagnosticStrand,DiagnosticBilingual[]>;
  risks:DiagnosticRisk[];riskIds:string[];
  pacingFlags:(DiagnosticBilingual&{strand:DiagnosticStrand;icon:string})[];
  actions:(DiagnosticBilingual&{bm_d:string;en_d:string;priority:number})[];
  qlog:{code:string;strand:DiagnosticStrand|null;tier:DiagnosticTier|null;question:string;question_en:string;status:'answered'|'correct'|'incorrect'|'skipped';rawAnswer:string|number|null;studentAnswer:string|number;correctAnswer:string|number|null;ms:number}[];
  totalMs:number;timingAvailable:boolean;timingNotice:string;
};
