import {NextResponse} from 'next/server';
import {importDiagnosticTemplate,DiagnosticError} from '@/lib/diagnostics';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')?.split(',')[0].trim()||request.headers.get('host')||new URL(request.url).host;
 let allowedOrigin=false;try{allowedOrigin=!!origin&&new URL(origin).host===host}catch{}
 if(!allowedOrigin)throw new DiagnosticError(403,'Diagnostic origin is not allowed');
 const raw=await request.text();if(raw.length>500000)throw new DiagnosticError(413,'Diagnostic template is too large');
 let data;try{data=JSON.parse(raw)}catch{throw new DiagnosticError(400,'Invalid diagnostic template')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new DiagnosticError(400,'Invalid diagnostic template');
 return NextResponse.json(await importDiagnosticTemplate(data.bank),{headers:{'Cache-Control':'private, no-store'}})
}catch(e){return NextResponse.json({error:e instanceof DiagnosticError?e.message:'Could not configure diagnostics'},{status:e instanceof DiagnosticError?e.status:500})}}
