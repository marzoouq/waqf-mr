/**
 * ملف Barrel الرسمي للأنواع — نقطة الدخول الموحَّدة
 *
 * استخدم: `import type { ... } from '@/types';`
 *
 * يُعيد تصدير جميع تعريفات الأنواع من المجلدات الفرعية.
 * هذا الملف هو المصدر الموحَّد المعتمد. ملف `database.ts` يُبقى للتوافق العكسي.
 */
export * from './models';
export * from './relations';
export * from './ui';
export * from './invoices';
export * from './advance';
export * from './zatca';
export * from './dashboard';
export * from './navigation';
