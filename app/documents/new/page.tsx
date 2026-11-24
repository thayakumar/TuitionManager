import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {requireAdminPage} from '@/lib/auth';
import {DocumentCreation} from '@/components/document-creation';
export const dynamic='force-dynamic';
export default async function NewDocument({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  await requireAdminPage();
  const params=await searchParams;
  if(params.kind!=='doc'&&params.kind!=='sheet')notFound();
  const classId=params.class_id===undefined?undefined:Number(params.class_id);
  if(classId!==undefined&&(!Number.isSafeInteger(classId)||classId<1))notFound();
  const requestHeaders=await headers();let entry='';try{entry=new URL(requestHeaders.get('referer')||'').pathname}catch{}
  // Only the library/lesson buttons auto-create; pasted/external URLs require a click.
  const sameSite=requestHeaders.get('sec-fetch-site')==='same-origin';
  const autoStart=sameSite&&(entry==='/documents'||/^\/meeting\/\d+\/documents$/.test(entry)||/^\/classes\/\d+$/.test(entry)||(entry==='/documents/new'&&typeof params.request_id==='string'));
  return <DocumentCreation kind={params.kind} classId={classId} autoStart={autoStart}/>;
}
