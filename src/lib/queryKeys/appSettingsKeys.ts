/**
 * مفاتيح React Query لإعدادات التطبيق — مصدر الحقيقة الوحيد.
 *
 * يخدم:
 *   - app-settings (per category)
 *   - app-settings-all (الكل)
 *   - app-settings-history (سجل التعديلات)
 *   - registration-enabled (تفعيل التسجيل العام)
 *
 * ملاحظات:
 *   - أول عنصر في كل مفتاح ثابت ولا يتغير (يستهلكه realtime عبر predicate
 *     على queryKey[0]).
 *   - أي تعديل على شكل المفتاح يحدث هنا فقط لمنع drift بين المنتجين
 *     والمستهلكين (invalidateQueries cross-file).
 */
export const appSettingsKeys = {
  /** إعدادات فئة واحدة (general | zatca | distribution | …) */
  byCategory: (category: string) =>
    ['app-settings', category] as const,

  /** كل الإعدادات (للاستهلاك الكلي) */
  all: () => ['app-settings-all'] as const,

  /** سجل تعديلات الإعدادات */
  history: (filterKey: string | null | undefined, limit: number) =>
    ['app-settings-history', filterKey ?? '__all__', limit] as const,

  /** حالة تفعيل التسجيل العام */
  registrationEnabled: () => ['registration-enabled'] as const,

  /** Prefixes — للاستخدام في invalidateQueries cross-file وrealtime */
  prefixes: {
    byCategory: ['app-settings'] as const,
    all: ['app-settings-all'] as const,
    history: ['app-settings-history'] as const,
    registrationEnabled: ['registration-enabled'] as const,
  },
} as const;
