import { ownStudentContext } from '@/lib/portal-context';
import { DocumentLibrary } from '@/components/document-library';
import { PageHeader } from '@/components/page-header';
export const dynamic = 'force-dynamic';
export default async function Documents({ params }: {
    params: Promise<{
        studentId: string;
    }>;
}) { await ownStudentContext(Number((await params).studentId)); return <><PageHeader title="My documents" subtitle="Documents and spreadsheets shared by your tutor."/><DocumentLibrary admin={false}/></>; }
