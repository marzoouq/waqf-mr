/** Pure rules for documented Ejar contract files. */
export const EJAR_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const EJAR_MAX_BYTES = 10 * 1024 * 1024;

export const validateEjarFile = (file: { type: string; size: number } | null): string | null => {
  if (!file) return 'اختر ملف العقد الموثق';
  if (!(EJAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) return 'نوع الملف غير مقبول — PDF أو JPG أو PNG فقط';
  if (file.size > EJAR_MAX_BYTES) return 'حجم الملف يتجاوز 10 ميغابايت';
  return null;
};

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
