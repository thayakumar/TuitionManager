import { requireAdminPage } from '@/lib/auth';
import { queryAll } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { DocumentLibrary } from '@/components/document-library';
export const dynamic = 'force-dynamic';
export default async function Documents() { await requireAdminPage(); const students = await queryAll<{
    id: number;
    name: string;
}>('SELECT id,name FROM students WHERE active=1 ORDER BY name'); return <><PageHeader title="Documents" subtitle="Your documents and spreadsheets, ready for the next lesson."/><DocumentLibrary admin students={students}/></>; }
