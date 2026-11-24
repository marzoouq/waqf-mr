/** Pure rules for uploaded official files (PDF/JPG/PNG up to 10MB). */
export const OFFICIAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const OFFICIAL_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const validateOfficialFile = (
  file: { type: string; size: number } | null,
  missingMessage: string,
): string | null => {
  if (!file) return missingMessage;
  if (!(OFFICIAL_FILE_TYPES as readonly string[]).includes(file.type)) return 'نوع الملف غير مقبول — PDF أو JPG أو PNG فقط';
  if (file.size > OFFICIAL_FILE_MAX_BYTES) return 'حجم الملف يتجاوز 10 ميغابايت';
  return null;
};
