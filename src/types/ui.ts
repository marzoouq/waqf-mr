/**
 * أنواع واجهة المستخدم المشتركة — مصدر موحّد لـ:
 *   - SortDir (الفرز)
 *   - FilterState / EMPTY_FILTERS (المرشّحات)
 *   - ExportableTable (التصدير)
 *
 * #39/#40 من تقرير الفحص: دمج الملفات المتفرقة (sorting/filters/export) في ملف واحد.
 * الملفات الأصلية تحوّلت إلى re-exports للتوافق العكسي مع الاستيرادات القديمة.
 */

// ─── الفرز ───
export type SortDir = 'asc' | 'desc';

// ─── المرشّحات ───
export interface FilterState {
  category: string;
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: '',
  propertyId: '',
  dateFrom: '',
  dateTo: '',
};

// ─── التصدير ───
export type ExportableTable =
  | 'properties'
  | 'contracts'
  | 'income'
  | 'expenses'
  | 'beneficiaries'
  | 'accounts'
  | 'invoices'
  | 'distributions'
  | 'units'
  | 'fiscal_years'
  | 'tenant_payments';
