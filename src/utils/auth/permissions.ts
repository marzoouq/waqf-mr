/**
 * دوال مركزية لصلاحيات التعديل — تُستخدم في كل صفحات الـ CRUD
 *
 * القاعدة: الناظر فقط يستطيع تعديل سنة مالية مقفلة.
 * المحاسب وبقية الأدوار ممنوعون.
 */

/** هل يستطيع هذا الدور تعديل بيانات سنة مالية (مقفلة أو نشطة)؟ */
export const canModifyFiscalYear = (role: string | null, isClosed: boolean): boolean =>
  !isClosed || role === 'admin';
