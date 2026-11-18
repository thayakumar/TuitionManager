import { createHash } from "crypto";
import type { Transaction, InValue } from "@libsql/client";
import { verifyAdminSession, getStudentSession } from "./auth";
import { queryAll, queryOne, withTransaction } from "./db";
import { DIAGNOSTIC_VERSION, loadDiagnosticBank, validateDiagnosticBank, publicQuestions, type DiagnosticBank } from "./diagnostic-bank";
import { computeDiagnosticReport, normalizeDiagnosticAnswers } from "./diagnostic-scoring";
import type { DiagnosticAnswers, DiagnosticReport } from "./diagnostic-types";

export class DiagnosticError extends Error {
  constructor(public status:number,message:string,public code?:string){super(message)}
}
export type DiagnosticContext={viewer?:'admin'|'student'};
export type DiagnosticStatus='awaiting'|'open'|'in_progress'|'submitted'|'locked';
type DiagnosticRow={student_id:number;studentName:string;gradeLevel:string|null;active:number;version:string;status:DiagnosticStatus;revision:number;answers:string;question_snapshot:string|null;report:string|null;class_id:number|null;opened_at:string|null;started_at:string|null;submitted_at:string|null;locked_at:string|null;updated_at:string};
type Actor={role:'admin'|'student';studentId:number|null;key:string};
const sqlRow="SELECT d.*,s.name AS studentName,s.grade_level AS gradeLevel,s.active FROM diagnostics d JOIN students s ON s.id=d.student_id WHERE d.student_id=?";
function studentKey(value:unknown){const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw new DiagnosticError(400,'Student is invalid');return n}
async function actorFor(context:DiagnosticContext={}):Promise<Actor>{
  const viewer=context.viewer||'admin';
  if(viewer==='admin'){
    if(!await verifyAdminSession())throw new DiagnosticError(401,'Sign in to your tutor account');
    return{role:'admin',studentId:null,key:'admin'};
  }
  if(viewer!=='student')throw new DiagnosticError(400,'Unknown diagnostic viewer');
  const sid=await getStudentSession();
  if(!sid)throw new DiagnosticError(401,'Sign in to your student account');
  const active=await queryOne('SELECT id FROM students WHERE id=? AND active=1',[sid]);
  if(!active)throw new DiagnosticError(401,'Student access is inactive');
  return{role:'student',studentId:sid,key:'student:'+sid};
}
async function record(tx:Pick<Transaction,'execute'>,sid:number,actor:Actor){
  if(actor.role==='student'&&actor.studentId!==sid)throw new DiagnosticError(404,'Diagnostic not found');
  const row=(await tx.execute({sql:sqlRow,args:[sid]})).rows[0] as unknown as DiagnosticRow|undefined;
  if(!row||(actor.role==='student'&&!row.active))throw new DiagnosticError(404,'Diagnostic not found');
  return row;
}
function savedBank(row:DiagnosticRow,current:DiagnosticBank|null){
  return row.question_snapshot ? validateDiagnosticBank(JSON.parse(row.question_snapshot)) : current;
}
function answersOf(row:DiagnosticRow):DiagnosticAnswers{return JSON.parse(row.answers)}
function scopedView(row:DiagnosticRow,actor:Actor,current:DiagnosticBank|null){
  const bank=savedBank(row,current),answers=answersOf(row);
  const isAdmin=actor.role==='admin',editable=['open','in_progress'].includes(row.status);
  const frozen=row.report?JSON.parse(row.report) as DiagnosticReport:null;
  const report=isAdmin ? frozen || (bank&&row.status==='in_progress'?computeDiagnosticReport(answers,bank):null) : row.status==='locked'?frozen:null;
  return{diagnostic:{studentId:Number(row.student_id),studentName:row.studentName,gradeLevel:row.gradeLevel,status:row.status,version:row.version,revision:Number(row.revision),classId:row.class_id,openedAt:row.opened_at,startedAt:row.started_at,submittedAt:row.submitted_at,lockedAt:row.locked_at,updatedAt:row.updated_at,answeredCount:Object.values(answers).filter(a=>a.value!==null&&a.value!=='').length,...(isAdmin||editable?{answers}:{}),...(report?{report}:{} )},questions:bank&&(isAdmin||editable)?publicQuestions(bank):[],configured:!!bank};
}
export async function diagnosticOverview(context:DiagnosticContext={}){
  const actor=await actorFor(context);if(actor.role!=='admin')throw new DiagnosticError(403,'Only your tutor can view all diagnostics');
  const rows=await queryAll<DiagnosticRow>(sqlRow.replace(' WHERE d.student_id=?',' ORDER BY s.active DESC,s.name'));
  return{diagnostics:rows.map(r=>({studentId:Number(r.student_id),studentName:r.studentName,gradeLevel:r.gradeLevel,active:!!r.active,status:r.status,version:r.version,revision:Number(r.revision),answeredCount:Object.values(answersOf(r)).filter(a=>a.value!==null&&a.value!=='').length,overallPct:r.report?(JSON.parse(r.report) as DiagnosticReport).overallPct:null,startedAt:r.started_at,submittedAt:r.submitted_at,lockedAt:r.locked_at}))};
}
export async function readDiagnostic(studentId:number,context:DiagnosticContext={}){
  const sid=studentKey(studentId),actor=await actorFor(context);
  if(actor.role==='student'&&actor.studentId!==sid)throw new DiagnosticError(404,'Diagnostic not found');
  const row=await queryOne<DiagnosticRow>(sqlRow,[sid]);
  if(!row||(actor.role==='student'&&!row.active))throw new DiagnosticError(404,'Diagnostic not found');
  return scopedView(row,actor,row.question_snapshot?null:await loadDiagnosticBank(row.version));
}
async function notice(tx:Transaction,sid:number,kind:'opened'|'submitted'|'locked',revision:number){
  const student=kind!=='submitted';
  const title=kind==='opened'?'Your diagnostic is ready':kind==='locked'?'Your diagnostic results are ready':'Diagnostic submitted';
  const message=kind==='opened'?'Your tutor opened your one-time readiness diagnostic.':kind==='locked'?'Your diagnostic is locked. You can view your readiness report.':'A student submitted their readiness diagnostic for your review.';
  await tx.execute({sql:"INSERT OR IGNORE INTO notifications(recipient_type,recipient_id,type,title,message,link,event_key)VALUES(?,?,?,?,?,?,?)",args:[student?'student':'admin',student?sid:null,'diagnostic_'+kind,title,message,student?'/portal/student/'+sid+'/diagnostic':'/diagnostics/'+sid,'diagnostic:'+sid+':'+kind+':'+revision]});
}
export type DiagnosticMutation={action:string;revision?:unknown;answers?:unknown;requestId?:unknown;classId?:unknown};
export async function mutateDiagnostic(studentId:number,data:DiagnosticMutation,context:DiagnosticContext={}){
  const sid=studentKey(studentId),actor=await actorFor(context);
  if(actor.role==='student'&&actor.studentId!==sid)throw new DiagnosticError(404,'Diagnostic not found');
  if(!['open','start','save','submit','lock'].includes(data.action))throw new DiagnosticError(400,'Unknown diagnostic action');
  if(['open','lock'].includes(data.action)&&actor.role!=='admin')throw new DiagnosticError(403,'Only your tutor can open or lock a diagnostic');
  if(['start','save','submit'].includes(data.action)&&actor.role!=='student')throw new DiagnosticError(403,'The student must complete their own diagnostic');
  const requestId=data.requestId===undefined?'':String(data.requestId);
  if(requestId&&!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))throw new DiagnosticError(400,'Request identifier is invalid');
  if(['save','submit'].includes(data.action)&&!requestId)throw new DiagnosticError(400,'A request identifier is required');
  const expected=Number(data.revision);
  if(!Number.isSafeInteger(expected)||expected<0)throw new DiagnosticError(400,'Diagnostic revision is required');
  const hash=createHash('sha256').update(JSON.stringify({action:data.action,revision:expected,answers:data.answers??null,classId:data.classId??null})).digest('hex');
  const now=new Date().toISOString();
  const changed=await withTransaction(async tx=>{
    let row=await record(tx,sid,actor);
    const templateRow=row.question_snapshot?null:(await tx.execute({sql:'SELECT data_json FROM diagnostic_templates WHERE version=?',args:[row.version]})).rows[0];
    const bank=savedBank(row,templateRow?validateDiagnosticBank(JSON.parse(String(templateRow.data_json))):null);
    if(requestId){
      const prior=(await tx.execute({sql:'SELECT request_hash FROM diagnostic_requests WHERE student_id=? AND actor_key=? AND request_id=?',args:[sid,actor.key,requestId]})).rows[0];
      if(prior){
        if(prior.request_hash!==hash)throw new DiagnosticError(409,'This request identifier was already used for different work','REQUEST_REUSED');
        if(data.action==='save'&&row.status==='in_progress'&&row.revision!==expected+1&&bank&&JSON.stringify(normalizeDiagnosticAnswers(data.answers,bank.items))!==row.answers)
          throw new DiagnosticError(409,'Newer answers were saved in another tab. Reload the saved work before continuing.','STALE_REVISION');
        return{row,bank};
      }
    }
    if(row.revision!==expected)throw new DiagnosticError(409,'This diagnostic changed in another tab. Reload to see the latest saved work.','STALE_REVISION');
    if(!bank)throw new DiagnosticError(503,'Diagnostic questions have not been configured yet. Please contact your tutor.','TEMPLATE_NOT_CONFIGURED');
    let status=row.status,answers=answersOf(row),report=row.report,openedAt=row.opened_at,startedAt=row.started_at,submittedAt=row.submitted_at,lockedAt=row.locked_at,classId=row.class_id,snapshot=row.question_snapshot;
    if(data.action==='open'){
      if(status!=='awaiting')throw new DiagnosticError(409,'This diagnostic has already been opened. A second attempt is not available.','ALREADY_OPENED');
      status='open';openedAt=now;snapshot=JSON.stringify(bank);
      if(data.classId!==undefined&&data.classId!==null){const id=studentKey(data.classId);const lesson=(await tx.execute({sql:"SELECT id FROM classes WHERE id=? AND student_id=? AND is_trial=0 AND status<>'canceled'",args:[id,sid]})).rows[0];if(!lesson)throw new DiagnosticError(400,'Choose a regular lesson belonging to this student');classId=id}
    }else if(data.action==='start'){
      if(status!=='open')throw new DiagnosticError(409,status==='awaiting'?'Your tutor has not opened this diagnostic yet.':'This diagnostic already has an attempt. Continue your saved work or view its status.','ATTEMPT_EXISTS');
      status='in_progress';startedAt=now;
    }else if(data.action==='save'||data.action==='submit'){
      if(status!=='in_progress')throw new DiagnosticError(409,'This diagnostic is not editable. Submitted and locked attempts cannot be changed.','NOT_EDITABLE');
      try{answers=normalizeDiagnosticAnswers(data.answers,bank.items)}catch(e){throw new DiagnosticError(400,e instanceof Error?e.message:'Answers are invalid')}
      if(data.action==='submit'){status='submitted';submittedAt=now;report=JSON.stringify(computeDiagnosticReport(answers,bank))}
    }else if(data.action==='lock'){
      if(!['in_progress','submitted'].includes(status))throw new DiagnosticError(409,status==='locked'?'This diagnostic is already locked.':'The student must start before the diagnostic can be locked.','NOT_LOCKABLE');
      if(!report)report=JSON.stringify(computeDiagnosticReport(answers,bank));
      status='locked';lockedAt=now;
    }
    const revision=Number(row.revision)+1;
    await tx.execute({sql:'UPDATE diagnostics SET status=?,revision=?,answers=?,question_snapshot=?,report=?,class_id=?,opened_at=?,started_at=?,submitted_at=?,locked_at=?,updated_at=? WHERE student_id=? AND revision=?',args:[status,revision,JSON.stringify(answers),snapshot,report,classId,openedAt,startedAt,submittedAt,lockedAt,now,sid,expected]});
    if(requestId)await tx.execute({sql:'INSERT INTO diagnostic_requests(student_id,actor_key,request_id,request_hash,created_at)VALUES(?,?,?,?,?)',args:[sid,actor.key,requestId,hash,now]});
    if(data.action==='open'||data.action==='submit'||data.action==='lock')await notice(tx,sid,data.action==='open'?'opened':data.action==='submit'?'submitted':'locked',revision);
    row={...row,status,revision,answers:JSON.stringify(answers),question_snapshot:snapshot,report,class_id:classId,opened_at:openedAt,started_at:startedAt,submitted_at:submittedAt,locked_at:lockedAt,updated_at:now};
    return{row,bank};
  });
  return scopedView(changed.row,actor,changed.bank);
}
export async function importDiagnosticTemplate(input:unknown,context:DiagnosticContext={}){
  const actor=await actorFor(context);if(actor.role!=='admin')throw new DiagnosticError(403,'Only your tutor can configure diagnostic questions');
  let bank:DiagnosticBank;try{bank=validateDiagnosticBank(input)}catch(e){throw new DiagnosticError(400,e instanceof Error?e.message:'Diagnostic template is invalid')}
  if(bank.version!==DIAGNOSTIC_VERSION)throw new DiagnosticError(400,'Unsupported diagnostic version');
  const serialized=JSON.stringify(bank);
  return withTransaction(async tx=>{
    const old=(await tx.execute({sql:'SELECT data_json FROM diagnostic_templates WHERE version=?',args:[bank.version]})).rows[0];
    if(old){if(JSON.stringify(validateDiagnosticBank(JSON.parse(String(old.data_json))))!==serialized)throw new DiagnosticError(409,'This diagnostic version is immutable. Use a new version for revised questions.','TEMPLATE_IMMUTABLE');return{success:true,version:bank.version,alreadyConfigured:true}}
    await tx.execute({sql:'INSERT INTO diagnostic_templates(version,data_json,created_at)VALUES(?,?,?)',args:[bank.version,serialized,new Date().toISOString()]});
    return{success:true,version:bank.version,alreadyConfigured:false};
  });
}
