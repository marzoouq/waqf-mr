import { rpc } from '@/lib/api/rpc';
import { logger } from '@/lib/logger';
import { setDocumentRegistrar, type IssuedDocumentRef } from '@/utils/pdf/core/officialRegistry';

interface IssueRow { doc_number: string; verification_code: string; issued_at: string }

/** يربط تسجيل الوثائق الرسمية بالخادم — الفشل لا يمنع التنزيل (الملف يصدر دون رقم مرجعي). */
export function installDocumentRegistrar(): void {
  setDocumentRegistrar(async ({ docType, contentHash, pageCount, fiscalYearId }): Promise<IssuedDocumentRef | null> => {
    try {
      const rows = (await rpc('issue_document', {
        p_doc_type: docType,
        p_content_hash: contentHash,
        p_page_count: pageCount,
        p_fiscal_year_id: fiscalYearId ?? undefined,
      })) as IssueRow[] | null;
      const row = rows?.[0];
      return row ? { docNumber: row.doc_number, verificationCode: row.verification_code, issuedAt: row.issued_at } : null;
    } catch (err) {
      logger.warn('[pdf] تعذّر تسجيل الوثيقة الرسمية', err);
      return null;
    }
  });
}
