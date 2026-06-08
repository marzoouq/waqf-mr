# الخطوة #1 — إنشاء `appSettingsKeys.ts` وترحيل كل المستهلكين

## الجردة الدقيقة (11 موضع، 9 ملفات)

### المفاتيح الأربعة وأشكالها الحالية

| المفتاح | الشكل الفعلي | غرضه |
|---|---|---|
| `app-settings` | `['app-settings', category]` (category: string) | إعدادات فئة واحدة (general/zatca/…) |
| `app-settings-all` | `['app-settings-all']` | كل الإعدادات (للقراءة الكلية) |
| `app-settings-history` | `['app-settings-history', filterKey ?? '__all__', limit]` | سجل التعديلات (filterKey + limit) |
| `registration-enabled` | `['registration-enabled']` | حالة تفعيل التسجيل العام |

### الملفات المنتجة (تُعرّف queryKey)

| # | الملف | المفاتيح |
|---|---|---|
| 1 | `src/hooks/data/settings/app/useAppSettingsRead.ts` | `app-settings`, `app-settings-all` |
| 2 | `src/hooks/data/settings/app/useAppSettings.ts` | `app-settings-all` |
| 3 | `src/hooks/data/settings/app/useAppSettingsHistory.ts` | `app-settings-history` |
| 4 | `src/hooks/data/settings/waqf/useWaqfInfo.ts` | `app-settings-all` |
| 5 | `src/hooks/data/settings/permissions/useRegistrationEnabled.ts` | `registration-enabled` |

### الملفات المستهلكة عبر `invalidateQueries`

| # | الملف | المفاتيح المُلغاة |
|---|---|---|
| 6 | `src/hooks/data/settings/app/useAppSettingsWrite.ts` | `app-settings` (per cat), `app-settings-all` |
| 7 | `src/hooks/page/admin/settings/useWaqfInfoSave.ts` | `app-settings/general`, `app-settings-all` |
| 8 | `src/hooks/page/admin/settings/useLogoUpload.ts` | `app-settings/general`, `app-settings-all` |
| 9 | `src/hooks/page/admin/management/zatca/useZatcaForm.ts` | `app-settings/zatca`, `app-settings-all` |
| 10 | `src/hooks/page/admin/management/zatca/useZatcaCompliance.ts` | `app-settings/zatca`, `app-settings-all` |
| 11 | `src/hooks/auth/role/useUserManagementMutations.ts` | `registration-enabled` |

> لا توجد اختبارات تشير إلى هذه المفاتيح حرفياً → آمن للترحيل.

---

## الملف الجديد المقترح

`src/lib/queryKeys/appSettingsKeys.ts` (نفس نمط `dashboardKeys.ts`):

```ts
/**
 * مفاتيح React Query لإعدادات التطبيق — مصدر الحقيقة الوحيد.
 *
 * يخدم: app-settings (per category), app-settings-all (الكل),
 *       app-settings-history (سجل), registration-enabled (تفعيل التسجيل).
 *
 * أول عنصر في كل مفتاح ثابت ولا يتغير (يستهلكه realtime عبر predicate).
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
```

---

## أنماط الاستبدال (Search & Replace الذهنية)

| نمط قديم | نمط جديد |
|---|---|
| `queryKey: ['app-settings', category]` | `queryKey: appSettingsKeys.byCategory(category)` |
| `queryKey: ['app-settings', 'general']` | `queryKey: appSettingsKeys.byCategory('general')` |
| `queryKey: ['app-settings', 'zatca']` | `queryKey: appSettingsKeys.byCategory('zatca')` |
| `queryKey: ['app-settings-all']` | `queryKey: appSettingsKeys.all()` |
| `queryKey: ['app-settings-history', filterKey ?? '__all__', limit]` | `queryKey: appSettingsKeys.history(filterKey, limit)` |
| `queryKey: ['registration-enabled']` | `queryKey: appSettingsKeys.registrationEnabled()` |
| `invalidateQueries({ queryKey: ['app-settings', cat] })` | `invalidateQueries({ queryKey: appSettingsKeys.byCategory(cat) })` |
| `invalidateQueries({ queryKey: ['app-settings-all'] })` | `invalidateQueries({ queryKey: appSettingsKeys.prefixes.all })` |
| `invalidateQueries({ queryKey: ['registration-enabled'] })` | `invalidateQueries({ queryKey: appSettingsKeys.prefixes.registrationEnabled })` |

**ملاحظة تصميمية**: لإلغاء كل المفاتيح من فئة `byCategory` (إن لزم لاحقاً) يكفي `prefixes.byCategory` لأن TanStack Query يطابق المُسبقات. حالياً كل invalidation لـ `app-settings` يستخدم category محددة → سنحافظ على نفس السلوك.

---

## ترتيب التنفيذ (11 خطوة فرعية)

كلها يمكن إجراؤها في commit واحد لأنها متماسكة موضوعياً، لكنها مرتّبة منطقياً:

1. **إنشاء** `src/lib/queryKeys/appSettingsKeys.ts`.
2. ترحيل `useAppSettingsRead.ts` (المنتج الأساسي — مفتاحان).
3. ترحيل `useAppSettings.ts`.
4. ترحيل `useAppSettingsHistory.ts`.
5. ترحيل `useWaqfInfo.ts`.
6. ترحيل `useRegistrationEnabled.ts`.
7. ترحيل `useAppSettingsWrite.ts` (invalidations الداخلية).
8. ترحيل `useWaqfInfoSave.ts`.
9. ترحيل `useLogoUpload.ts`.
10. ترحيل `useZatcaForm.ts` و `useZatcaCompliance.ts` (cross-domain لكن نفس المفاتيح).
11. ترحيل `useUserManagementMutations.ts`.

---

## Definition of Done

1. **التحقق الحرفي**: `rg "['\"]app-settings|['\"]registration-enabled" src --type ts --type tsx -g '!**/queryKeys/**' -g '!*.test.*'` يُرجع **0** نتائج (خارج الملف المركزي).
2. **typecheck** نظيف.
3. **lint** نظيف.
4. **الاختبارات** خضراء (Vitest لا يلامس هذه المفاتيح حرفياً، لكن نشغّل المجموعة كاملة للسلامة).
5. **معاينة سريعة** في `/auth` و `/dashboard/settings` لاستبعاد أي regression في التزامن.

## التراجع

`git revert` واحد. الملف الجديد قائم بذاته، والتعديلات الـ10 الأخرى تستبدل literals بـ function calls تنتج tuples متطابقة حرفياً → لا تغيير سلوكي ممكن.

## بعد الانتهاء

تحديث `mem://index.md` بإضافة مرجع جديد:
`- [QueryKeys Centralization](mem://technical/architecture/querykeys-centralization) — مفاتيح TanStack مُجمَّعة في lib/queryKeys/<feature>.ts؛ ممنوع literals جديدة`

(الذاكرة التفصيلية تُكتب بعد اكتمال الموجة أ الكاملة، ليس بعد هذه الخطوة وحدها.)
