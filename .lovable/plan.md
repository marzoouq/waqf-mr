# تقرير تدقيق المعمارية — نظام إدارة وقف مرزوق بن علي الثبيتي

> **تحليل للقراءة فقط** — لم يُعدَّل أي ملف. التنفيذ يحتاج موافقتك ثم الانتقال إلى Build Mode.

## 1) ملخص الحالة الصحية

| المقياس | القيمة | التقدير |
|---|---|---|
| إجمالي ملفات TS/TSX | 1156 | — |
| ملفات إنتاج تتجاوز 200 سطر | **3 فقط** | ✅ ممتاز |
| `console.*` في الإنتاج | **0** | ✅ مثالي |
| استيراد Supabase خام في `pages/` | **0** | ✅ مثالي |
| استيراد Supabase خام في `components/` | **2** (تحتاج نقل) | ⚠️ |
| `sonner` في `utils/` | **0** | ✅ |
| `: any` غير موثّق | **0** (الموجودان موثّقان eslint-disable) | ✅ |
| `@ts-ignore` / `@ts-nocheck` | **0** | ✅ مثالي |
| `eslint-disable` | 41 | 🟡 مقبول |
| Pages بـ `useState/useEffect` مباشر | **2 من 48** | ✅ ممتاز |
| Page Hooks | 85 لـ 48 صفحة | ✅ متوافق مع Page Hook Pattern |
| Migrations | 340 | 🟡 يستحق ضغط baseline لاحقاً |

**الخلاصة**: المعمارية نظيفة، الفصل بين الطبقات قوي، والقواعد المحفوظة في الذاكرة مُطبّقة. التوصيات أدناه نقاط جراحية لا إصلاح شامل.

---

## 2) قائمة التوصيات (مرتّبة بالأولوية)

### 🔴 حرج — انتهاكات صريحة لقواعد الذاكرة

**T1 — انتهاك Hooks Layering: `hooks/data` يعتمد على `hooks/domain`**
الذاكرة `mem://technical/architecture/hooks-layering-data-vs-domain` تنص على فصل `data` (Supabase خام) عن `domain` (حسابات). يوجد عكس دائرة في مكانين:
- `src/hooks/data/content/useAnnualReport.ts:11` → يُعيد تصدير `useIncomeComparison` من `@/hooks/domain/financial/useIncomeComparison`
- `src/hooks/data/financial/useAdvanceQueries.ts:57` → يُعيد تصدير `useMyBeneficiaryFinance` من `@/hooks/domain/financial/useAdvanceCalculations`

**الإصلاح**: حذف الـ re-exports، وتحديث المستوردين ليستوردوا من `@/hooks/domain/...` مباشرة. لا يحتاج منطقاً جديداً.

**T2 — مكوّن يحتوي طبقة بيانات (Container/Presentational violation)**
`src/components/settings/BankAccountTab.tsx` يستدعي `useMutation` + `useQueryClient` داخل المكوّن (السطور 12، 23، 27).
**الإصلاح**: استخراج `useUpdateBeneficiarySelf` إلى `src/hooks/data/beneficiaries/`، ثم اختياري wrapper في `hooks/page/beneficiary/settings/` للـ toast. المكوّن يبقى عرضياً بالكامل.

**T3 — Barrel-to-barrel في `src/types/index.ts`**
يُعيد التصدير من `./financial` (وهو نفسه barrel) ومن `./models`، `./relations`، إلخ. قاعدة `mem://technical/architecture/barrel-import-rule` تمنع ذلك (يكسر tree-shaking ويفتح حلقات).
**الإصلاح**: إما تسطيح `./financial/index.ts` ودمج محتواه في ملفات مفرّدة مرئية من `types/index.ts`، أو حذف barrel `./financial` ودع `types/index.ts` يستورد الملفات النهائية مباشرة. نفس المراجعة لـ `./forms/*`.

---

### 🟠 عالٍ — نظافة معمارية

**T4 — صفحات تحتفظ بحالة محلية بدل Page Hook**
- `src/pages/beneficiary/SupportPageGuard.tsx` — 2× `useState/useEffect` (قاعدة Page Hook Pattern).
- `src/pages/dashboard/PropertiesPage.tsx` — استخدامات للـ hooks الأخرى; تأكيد لاحق.

**الإصلاح**: نقل المنطق إلى `useSupportPageGuard()` تحت `hooks/page/beneficiary/messaging/`.

**T5 — `hooks/data/financial` تضخّم (22 ملفاً)**
المجلد بدأ يصبح مكب. هناك مجموعات منفصلة طبيعياً:
```
data/financial/
  ├── accounts/        (useAccounts, useAccountCategories, useCloseFiscalYear)
  ├── advances/        (useAdvanceQueries, useAdvanceRequests, useMaxAdvanceAmount, useDistributionAdvances)
  ├── distribution/    (useDistribute, useDistributionHistory)
  ├── expenses/        (useExpenses, useExpenseBudgets)
  ├── income/          (useIncome, useIncomeComparison)
  ├── fiscalYears/     (useFiscalYears, useFiscalYearSummary, useMultiYearSummary, useYearComparisonData)
  └── dashboard/       (useDashboardSummary, useTotalBeneficiaryPercentage)
```
**الإصلاح**: تقسيم المجلد + تحديث `index.ts` كـ barrel مستوٍ (سطر مستوى واحد فقط) دون كسر المستوردين بفضل تحديث المسار بحركة `mv`.

**T6 — `hooks/data/settings` تضخّم (18 ملفاً)**
نفس النمط:
```
data/settings/
  ├── app/         (useAppSettings, useAppSettingsRead/Write/History, appSettingsUtils)
  ├── appearance/  (useAppearanceSettings, useBannerSettings, useLogoUpload)
  ├── permissions/ (useRolePermissions, useRegistrationEnabled, useFeatureVisibility, useSectionsVisibility)
  ├── waqf/        (useWaqfInfo, useWaqfInfoSave, usePdfWaqfInfo)
  └── notifications/ (useNotificationSettings, useBeneficiaryWidgets)
```

**T7 — التباس `hooks/application` مقابل `hooks/page`**
كلاهما يحتوي مجلد `dashboard/`:
- `hooks/application/dashboard/`: `useEndUserDashboardData`, `useEndUserFinancials` (عابر للأدوار — هذا صحيح حسب `mem://technical/architecture/hooks-application-layer`).
- `hooks/page/admin/dashboard/`: hooks خاصة بـ admin.

الذاكرة موثّقة لكن الأسماء قد تُربك. **الإصلاح**: إضافة `hooks/application/README.md` مختصر يوضّح الحدود + JSDoc على كل ملف في `application/dashboard` يشير صراحة "cross-role; لـ admin/accountant استخدم page/admin".

---

### 🟡 متوسط — تحسينات بنيوية

**T8 — `components/messages/` فيه ملفان متشابهان جداً**
- `ConversationList.tsx`
- `ConversationsList.tsx`

تسمية مختلفة بحرف واحد = إشارة قوية على تكرار/نسيان. **الإصلاح**: مراجعة، توحيد إلى مكوّن واحد أو إعادة تسمية صريحة (مثل `ConversationListItem` vs `ConversationListContainer`).

**T9 — `components/shared/dashboard/` فيه ملف واحد**
`DashboardLazySection.tsx` وحيد في مجلد. **الإصلاح**: نقل إلى `components/common/` أو `components/dashboard/` وحذف `shared/` الفارغ.

**T10 — `app/router.tsx` + `routes/*.tsx` — مزدوج الإحساس**
بعد الفحص: `app/router.tsx` يُركّب الـ `RouterProvider`، و `routes/*.tsx` تصدّر `<Route>` elements للأدوار. هذا نمط Composition سليم. **الإصلاح المقترح**: إضافة README مختصر في `src/app/` و `src/routes/` يوضح "app = root composition، routes = role-specific elements" لمنع التباس مستقبلي.

**T11 — ملفات إنتاج تتجاوز حد 200 سطر**
| الملف | الأسطر |
|---|---|
| `src/utils/pdf/entities/accountsPdf.ts` | 221 |
| `src/components/layout/DashboardLayout.tsx` | 212 |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | 201 |

**الإصلاح**: تقسيم جراحي:
- `accountsPdf.ts` → فصل الـ helpers (`buildSummarySection`, `buildBeneficiariesSection`) إلى ملفات منفصلة في نفس المجلد.
- `DashboardLayout.tsx` → استخراج `<Sidebar>` و`<Topbar>` إلى مكوّنات مستقلة.
- `PropertiesViewPage.tsx` → التحقق أن المنطق فعلاً في page hook، وإلا استخراجه.

**T12 — TODO معلّق**
`src/hooks/page/admin/financial/useAccountsPage.ts:80`:
```
TODO: إعادة تصميم useAccountsActions ليستقبل overdueSplit كقيمة مستقرة بدل mutation لمرجع.
```
يستحق معالجة أو تحويله إلى issue رسمي.

---

### 🟢 منخفض — تحسينات اختيارية

**T13 — `eslint-disable` (41 موقع)** — تدقيق دفعة واحدة لإزالة المبررات الضعيفة. هدف واقعي: تقليلها إلى < 25.

**T14 — Migrations baseline squash** — 340 ملف migration. بعد سنة من العمل، يستحق إنتاج baseline موحّد + الإبقاء على آخر 30-50 migration. **خطر**: عملية حساسة، تتطلب نسخ احتياطي ومحاكاة على بيئة فرعية.

**T15 — `hooks/page/beneficiary/index.ts` و `hooks/page/waqif/`** — قليلة الملفات؛ تأكيد أن البنية النيستد المستخدمة (subfolders) مقصودة وليست لخطأ تنظيمي.

**T16 — JSDoc موحّد لكل page hook** — ~85 ملفاً؛ إضافة header موحّد (`@page`, `@role`, `@dependencies`) يسهّل الـ navigation للذكاء الاصطناعي ولمراجعي الكود.

---

## 3) مقاييس مرجعية بعد التنفيذ (DoD)

- 0 ملف في `hooks/data/*` يستورد من `hooks/domain/*`
- 0 مكوّن في `components/` يستورد `useMutation` / `useQuery` / `supabase`
- 0 ملف إنتاج > 200 سطر (باستثناء `integrations/supabase/types.ts` التلقائي)
- 0 ملف Page بدون Page Hook مقابل
- `bunx tsc --noEmit` نظيف، `vitest` كل 1849 اختبار يجتاز
- README موجز في `src/app/`, `src/routes/`, `src/hooks/application/`

---

## 4) خطة تنفيذ مقترحة (مراحل قابلة للموافقة منفصلة)

**المرحلة 1 — حرجة (T1, T2, T3)** — ~6 ملفات، تأثير معدوم على المستخدم النهائي، يصلح انتهاكات قواعد الذاكرة فوراً.

**المرحلة 2 — تنظيم بنية (T4, T8, T9, T11, T12)** — نقل/تقسيم ملفات + معالجة TODO. يحتاج اختبار يدوي للصفحات الثلاث الكبيرة.

**المرحلة 3 — إعادة هيكلة subdirectories (T5, T6)** — تقسيم `hooks/data/financial` و`hooks/data/settings`. الأكبر أثراً على المستوردين؛ يجب فعله في PR واحد منفصل لتسهيل المراجعة.

**المرحلة 4 — وثائق وتنظيف (T7, T10, T13, T15, T16)** — README و JSDoc و تنظيف eslint-disable.

**المرحلة 5 (مستقلة، مؤجلة) — T14 squash migrations** — تحتاج نافذة صيانة مخصصة.

---

## 5) ما لم يُدقَّق في هذه الجولة

- تحليل الأمان الفعلي للـ RLS (يتم بأداة `supabase--linter` منفصلة).
- تحليل الأداء (bundle size, lazy chunks).
- مراجعة UX/visual.
- اختبار end-to-end للمسارات المعطّلة سابقاً (تمّت في الجولة السابقة).

موافقتك على المراحل (كلها أو محددة) تنقلنا إلى Build Mode للتنفيذ.