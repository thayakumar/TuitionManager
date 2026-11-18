import {NextResponse} from 'next/server';
import {diagnosticOverview,DiagnosticError,type DiagnosticContext} from '@/lib/diagnostics';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return NextResponse.json(await diagnosticOverview({viewer:(new URL(request.url).searchParams.get('viewer')||'admin') as DiagnosticContext['viewer']}),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return NextResponse.json({error:e instanceof DiagnosticError?e.message:'Could not load diagnostics'},{status:e instanceof DiagnosticError?e.status:500})}}
