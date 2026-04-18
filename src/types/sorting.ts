/**
 * أنواع الفرز المشتركة
 *
 * - `SortDir` — اتجاه الفرز (re-export من `types/ui` للتوافق العكسي مع 70+ ملف).
 * - `SortFieldOf<T>` — generic لتقييد حقول الفرز بالأعمدة الفعلية للجدول (موجة 14).
 *
 * مثال الاستخدام:
 *   type IncomeSortField = SortFieldOf<'amount' | 'date' | 'source'>;
 *   // = 'amount' | 'date' | 'source' | null
 */
export type { SortDir } from './ui';

/** يُولِّد type لحقول الفرز يسمح بـ null (لا فرز نشط) */
export type SortFieldOf<TFields extends string> = TFields | null;
