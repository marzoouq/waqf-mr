/**
 * رسائل توست موحّدة لعمليات تصدير وتحميل ملفات PDF.
 * تمنع تكرار النصوص الحرفية عبر طبقات الـ hooks/page.
 */
export const PDF_MESSAGES = {
  exportError: 'حدث خطأ أثناء تصدير PDF',
  downloadSuccess: 'تم تحميل ملف PDF بنجاح',
} as const;

/**
 * رسائل توست موحّدة لعمليات حفظ الإعدادات.
 */
export const SAVE_MESSAGES = {
  saveError: 'حدث خطأ أثناء الحفظ',
  saveSuccess: 'تم حفظ الإعدادات بنجاح',
} as const;
