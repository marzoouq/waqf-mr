/**
 * استخراج آمن لرمز حالة HTTP من خطأ غير معروف
 * يُستخدم بدلاً من تكرار `(error as { status?: number })?.status`
 */
export const getErrorStatus = (error: unknown): number | undefined =>
  (error as { status?: number } | null | undefined)?.status;
