/**
 * featureVisibilityRegistry — مصدر الحقيقة لمفاتيح إظهار/إخفاء الميزات
 *
 * يستخدمه الناظر من شبكة "إظهار/إخفاء الميزات" للتحكم بظهور عناصر واجهة
 * المستفيد/الواقف/المحاسب. طبقة عرض بحتة — لا تستبدل أي RLS.
 *
 * - scope: للأي دور تخص الميزة (يُستخدم للتجميع البصري فقط).
 * - key: معرّف ثابت يُحفَظ في app_settings كـ `feature_visibility.<scope>.<key>`.
 * - label: تسمية عربية تظهر للناظر في الشبكة.
 * - description: شرح موجز اختياري.
 * - lockable: عناصر إلزامية لا يجوز إخفاؤها (إفصاح قانوني/تنظيمي). تظهر معطّلة في الشبكة.
 *
 * الافتراضي لكل مفتاح غير محفوظ هو `visible` (توافق خلفي).
 */
export type FeatureScope = 'beneficiary' | 'waqif' | 'accountant';

export interface FeatureVisibilityEntry {
  scope: FeatureScope;
  key: string;
  label: string;
  description?: string;
  lockable: boolean;
  /** إذا true، الافتراضي = hidden (تفعيل صريح من الناظر). */
  defaultHidden?: boolean;
}

export const FEATURE_SCOPE_LABELS: Record<FeatureScope, string> = {
  beneficiary: 'لوحة المستفيد',
  waqif: 'لوحة الواقف',
  accountant: 'لوحة المحاسب',
};

export const FEATURE_VISIBILITY_REGISTRY: readonly FeatureVisibilityEntry[] = [
  // — لوحة المستفيد —
  {
    scope: 'beneficiary',
    key: 'disclosure_notice',
    label: 'الإفصاح السنوي',
    description: 'الإفصاح القانوني المُلزِم للمستفيد عن حصته ومصاريف الوقف.',
    lockable: true,
  },
  {
    scope: 'beneficiary',
    key: 'share_summary',
    label: 'ملخّص حصتي من الريع',
    description: 'البطاقة المركزية التي تعرض حصة المستفيد المحسوبة للسنة الحالية.',
    lockable: false,
  },
  {
    scope: 'beneficiary',
    key: 'advance_request',
    label: 'طلب السُلفة',
    description: 'بطاقة طلب سُلفة مقدّمة على حساب الحصة.',
    lockable: false,
  },
  {
    scope: 'beneficiary',
    key: 'carryforward_section',
    label: 'الترحيلات والخصومات',
    description: 'قسم يعرض الترحيلات السابقة وأي خصومات على الحصة.',
    lockable: false,
  },
  {
    scope: 'beneficiary',
    key: 'recent_distributions',
    label: 'آخر التوزيعات',
    description: 'قائمة بأحدث توزيعات الريع للمستفيد.',
    lockable: false,
  },

  // — لوحة الواقف —
  {
    scope: 'waqif',
    key: 'financial_section',
    label: 'القسم المالي للواقف',
    description: 'إجمالي الدخل والمصروفات والمتاح بعد الضريبة.',
    lockable: false,
  },
  {
    scope: 'waqif',
    key: 'charts_section',
    label: 'الرسوم البيانية',
    description: 'رسوم بيانية شهرية ورسوم المصروفات.',
    lockable: false,
  },
  {
    scope: 'waqif',
    key: 'quick_links',
    label: 'الروابط السريعة',
    description: 'بطاقات تنقّل سريعة لأقسام الواقف.',
    lockable: false,
  },

  // — لوحة المحاسب —
  {
    scope: 'accountant',
    key: 'overdue_invoices_widget',
    label: 'الفواتير المتأخرة',
    description: 'ويدجت تركيز المحاسب على الفواتير المستحقة المتأخرة.',
    lockable: false,
  },
  {
    scope: 'accountant',
    key: 'collections_summary',
    label: 'ملخّص التحصيل',
    description: 'ملخّص سريع لإجماليات التحصيل اليومي/الشهري.',
    lockable: false,
  },
] as const;

/** تجميع السجل حسب النطاق — للعرض في شبكة الناظر. */
export const FEATURE_REGISTRY_BY_SCOPE: Record<FeatureScope, FeatureVisibilityEntry[]> =
  FEATURE_VISIBILITY_REGISTRY.reduce(
    (acc, entry) => {
      acc[entry.scope].push(entry);
      return acc;
    },
    { beneficiary: [], waqif: [], accountant: [] } as Record<FeatureScope, FeatureVisibilityEntry[]>,
  );

/** مفتاح التخزين في app_settings. */
export const featureVisibilityKey = (scope: FeatureScope, key: string): string =>
  `feature_visibility.${scope}.${key}`;
