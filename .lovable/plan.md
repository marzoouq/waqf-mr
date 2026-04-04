
# تقرير الفحص الشامل للمعمارية

## حالة البناء: ✅ صفر أخطاء

`npx tsc --noEmit` يمر بنجاح. الأخطاء المعروضة سابقاً **قديمة/مُخزّنة مؤقتاً** ولا تعكس الكود الحالي. جميع الاستيرادات تستخدم المسارات الصحيحة (`@/utils/format/format` وليس `@/utils/format`).

---

## النتائج المكتشفة

### 🔴 حرجة (Critical)

#### C-1: `useAccountsPage` في المجلد الخاطئ
- **الملف:** `src/hooks/financial/useAccountsPage.ts` (+ ملف الاختبار)
- **المشكلة:** هذا page hook وليس financial hook. كل page hooks الأخرى في `hooks/page/admin/` أو `hooks/page/beneficiary/`
- **الإجراء:** نقل إلى `src/hooks/page/admin/useAccountsPage.ts`

#### C-2: مكونات إشعارات داخل مجلد pages
- **المسار:** `src/pages/beneficiary/notifications/` (4 ملفات)
- **المشكلة:** مكونات UI (`NotificationStatsCards`, `NotificationFiltersBar`, `NotificationsList`) و constants يجب ألا تكون في `pages/`. الأسوأ: hook في `beneficiary/useNotificationsPage.ts` يستورد constants من `pages/`:
  ```
  import { NOTIFICATION_CATEGORIES } from '@/pages/beneficiary/notifications/notificationConstants';
  ```
- **الإجراء:** نقل إلى `src/components/notifications/` أو `src/components/beneficiary-notifications/`

#### C-3: `PropertiesViewPage.tsx` (192 سطر) بدون page hook
- **المشكلة:** يحتوي على PDF export logic مباشر + يستخدم `usePropertiesViewData` لكن لا يوجد `usePropertiesViewPage` hook مخصص. باقي الصفحات المماثلة لديها hooks مستخرجة.
- **الإجراء:** استخراج `usePropertiesViewPage` في `hooks/page/beneficiary/`

---

### 🟡 مهمة (Important)

#### I-1: صفحات admin تحتوي على PDF/export logic مباشر
9 صفحات admin تستورد وتستدعي `generatePDF` مباشرة بدل تفويضها للـ hook:
- `AccountsPage.tsx` (259 سطر — الأكبر)
- `BeneficiariesPage.tsx`, `BylawsPage.tsx`, `ContractsPage.tsx`
- `ExpensesPage.tsx`, `IncomePage.tsx`, `InvoicesPage.tsx`
- `AnnualReportPage.tsx` (211 سطر)
- `HistoricalComparisonPage.tsx` (194 سطر)

**الإجراء:** نقل PDF/CSV callbacks إلى page hooks الموجودة فعلاً (كل هذه الصفحات لديها hooks).

#### I-2: `layout/constants.ts` يحتوي على 5 مجالات مختلفة (209 سطر)
Navigation links, permissions, sections, route titles, accountant exclusions — كلها في ملف واحد.
**الإجراء:** تقسيم إلى `layout/constants/navigation.ts`, `permissions.ts`, `sections.ts`, `routeTitles.ts` + barrel file.

#### I-3: مكونات تقترب من حد 250 سطر
| الملف | الأسطر |
|-------|--------|
| `ZatcaInvoicesTab.tsx` | 229 |
| `MonthlyPerformanceReport.tsx` | 224 |
| `YearOverYearComparison.tsx` | 220 |
| `AccountsDistributionTable.tsx` | 219 |
| `LoginForm.tsx` | 213 |

هذه قريبة من الحد ولكنها ليست عاجلة. تُراقب عند أي تعديل مستقبلي.

#### I-4: hooks تقترب من حد 250 سطر
| الملف | الأسطر |
|-------|--------|
| `useCrudFactory.ts` | 237 |
| `useInvoicesPage.ts` | 235 |
| `useContractsPage.ts` | 235 |
| `usePaymentInvoicesTab.ts` | 231 |
| `useWebAuthn.ts` | 228 |

---

### 🟢 اختيارية (Optional)

#### O-1: `hooks/financial/` يحتوي على 35 ملف
المجلد كبير لكن التصميم منطقي (financial hooks = data fetching + computation). لا يتداخل فعلياً مع `hooks/data/financial/`. **لا إجراء مطلوب حالياً.**

#### O-2: Barrel file مفقود لـ `src/utils/`
المجلدات الفرعية لديها barrel files، لكن `src/utils/index.ts` الشامل غير موجود. اختياري — الاستيرادات المباشرة أوضح.

---

## ما هو سليم ✅

- **صفر استدعاءات Supabase مباشرة في components** — فصل مسؤوليات ممتاز
- **صفر toast مباشر في hooks** — كلها تستخدم notify pattern
- **بنية utils نظيفة** — 7 مجلدات فرعية + barrel files (المرحلة 2 مكتملة)
- **6 page hooks مستفيد مستخرجة** (المرحلة 1 مكتملة)
- **لا ملفات يتيمة** في `src/hooks/` (المرحلة 3 مكتملة)
- **Type safety محسّنة** في pdfHelpers (المرحلة 4 مكتملة)

---

## خطة التنفيذ المرتبة

| # | الإجراء | التأثير | الجهد |
|---|---------|---------|-------|
| 1 | C-2: نقل notification components من pages إلى components | عالي | منخفض |
| 2 | C-1: نقل `useAccountsPage` إلى `hooks/page/admin/` | متوسط | منخفض |
| 3 | C-3: استخراج `usePropertiesViewPage` hook | متوسط | منخفض |
| 4 | I-1: نقل PDF/CSV logic من admin pages إلى hooks | متوسط | متوسط |
| 5 | I-2: تقسيم `layout/constants.ts` | منخفض | منخفض |
| 6 | I-3/I-4: مراقبة الملفات القريبة من حد 250 سطر | منخفض | — |
