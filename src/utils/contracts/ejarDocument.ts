/** Pure rules for documented Ejar contract files. */
import { OFFICIAL_FILE_TYPES, OFFICIAL_FILE_MAX_BYTES, validateOfficialFile } from '@/utils/files/officialFile';

export const EJAR_ALLOWED_TYPES = OFFICIAL_FILE_TYPES;
export const EJAR_MAX_BYTES = OFFICIAL_FILE_MAX_BYTES;

export const validateEjarFile = (file: { type: string; size: number } | null): string | null =>
  validateOfficialFile(file, 'اختر ملف العقد الموثق');

export const ejarDatesMismatch = (
  doc: { ejar_start_date: string | null; ejar_end_date: string | null },
  contract: { start_date: string; end_date: string },
): boolean =>
  (!!doc.ejar_start_date && doc.ejar_start_date !== contract.start_date)
  || (!!doc.ejar_end_date && doc.ejar_end_date !== contract.end_date);

export const ejarErrorMessage = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (msg.includes('contract_documents_ejar_number_current')) return 'رقم عقد إيجار مستخدم في عقد آخر';
  if (/[\u0600-\u06FF]/.test(msg)) return msg;
  return 'تعذّر رفع الملف';
};
