import {NextResponse} from 'next/server';
import {readDiagnostic,mutateDiagnostic,DiagnosticError,type DiagnosticContext} from '@/lib/diagnostics';
export const dynamic='force-dynamic';
const failure=(e:unknown)=>NextResponse.json({error:e instanceof DiagnosticError?e.message:'Could not update diagnostic',code:e instanceof DiagnosticError?e.code:undefined},{status:e instanceof DiagnosticError?e.status:500,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request,{params}:{params:Promise<{studentId:string}>}){try{return NextResponse.json(await readDiagnostic(Number((await params).studentId),{viewer:(new URL(request.url).searchParams.get('viewer')||'admin') as DiagnosticContext['viewer']}),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request,{params}:{params:Promise<{studentId:string}>}){try{
 const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')?.split(',')[0].trim()||request.headers.get('host')||new URL(request.url).host;
 if(!origin||new URL(origin).host!==host)throw new DiagnosticError(403,'Diagnostic origin is not allowed');
 if(Number(request.headers.get('content-length')||0)>200000)throw new DiagnosticError(413,'Diagnostic request is too large');
 const raw=await request.text();if(raw.length>200000)throw new DiagnosticError(413,'Diagnostic request is too large');
 let data;try{data=JSON.parse(raw)}catch{throw new DiagnosticError(400,'Invalid diagnostic request')}
 return NextResponse.json(await mutateDiagnostic(Number((await params).studentId),data,{viewer:data.viewer||'admin'}),{headers:{'Cache-Control':'private, no-store'}})
}catch(e){return failure(e)}}
