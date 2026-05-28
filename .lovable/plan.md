# خطة الجولة التالية — مراجعة جنائية وتنفيذ دقيق

## نتائج الفحص الجنائي قبل التنفيذ

راجعت كل ادعاء من خطة الجولة السابقة مقابل الكود الفعلي. الخلاصة:

### ❌ ادعاءات سقطت في الفحص — لن تُنفَّذ

1. **P1-7 (`useEmailMonitorActions` انتهاك طبقات)** — خاطئ. الملف يستخدم `invoke` من `@/lib/api/invoke` (الغلاف الصحيح)، لا يستورد `supabase` مباشرة. ووجود `toast` في `hooks/page/` مسموح به صراحةً حسب قاعدة `mem://conventions/no-toast-in-data-hooks`. **لا انتهاك — لا تغيير.**

2. **B1 (`AdminDashboard`: بطاقة "رقبة الوقف المرحَّلة")** — خاطئ. التعليقات في `useAdminDashboardStats.ts:94-98` تنصّ صراحة على أن هذه البطاقة "رُحّلت لـ AccountsSummaryCards عمداً ولا تُكرَّر هنا". البطاقة موجودة فعلاً في `AccountsSummaryCards.tsx:64-68` (تظهر إذا `> 0`). **القرار المعماري قائم — لا تغيير.**

3. **B2 (`AdminDashboard`: بطاقة "الصافي بعد الزكاة")** — خاطئ. موجودة فعلاً في `AccountsSummaryCards.tsx:100-103`. وفي `useAdminDashboardStats.ts:33` معلَّمة `@deprecated غير مستخدم بعد Wave D`. **القرار المعماري قائم — لا تغيير.**

---

## التنفيذ الفعلي (دقيق، مُتحقَّق منه)

### P0-2 — تنبيه على القيم اليدوية غير المحفوظة ✅ مؤكَّد
**السياق المُتحقَّق منه:**
- `useAccountsSettings.ts:82-90` — setters تكتب فقط في `overrides` state.
- `AccountsPage.tsx:67-68` — تمرّر setters للـ UI، لكن لا توجد أي استدعاء `updateAccount` في الصفحة.
- بحث `rg "updateAccount"` في `hooks/page/admin/` و `accounts/` → **0 نتائج**.
- النتيجة: تعديل `manualVat / zakatAmount / waqfCorpusManual / manualDistributions` في الواجهة يضيع عند F5.

**العمل:**
- في `src/components/accounts/AccountsSummaryCards.tsx`:
  - إضافة 4 props اختيارية: `defaultManualVat`, `defaultZakatAmount`, `defaultWaqfCorpusManual`, `defaultManualDistributions` (القيم الأصلية من DB).
  - إضافة `Alert` ظاهرة فقط عندما أي قيمة معروضة ≠ القيمة الأصلية، بنص:
    > "تم تعديل قيمة يدوية في الواجهة فقط — لم تُحفظ في قاعدة البيانات وستُفقد عند تحديث الصفحة."
  - شارة `غير محفوظ` بجانب كل بطاقة متأثرة.
- في `src/pages/dashboard/AccountsPage.tsx`: تمرير القيم الأصلية من `currentAccount` (vat_amount, zakat_amount, waqf_corpus_manual, distributions_amount).

### P1-3 — `useAnnualReportPage` يحترم snapshot للسنة المُقفلة ✅ مؤكَّد
**السياق المُتحقَّق منه:**
- `useAnnualReportPage.ts:66-67` — يحسب `totalIncome/totalExpenses` بـ `reduce` محلي على `income/expenses` المُحمَّلة، بغض النظر عن `isClosed`.
- لا يستخدم `accounts.total_income/total_expenses` من snapshot.

**العمل:**
- جلب `currentAccount` عبر `useAccounts` + `findAccountByFY`.
- إذا `fiscalYear?.status === 'closed'` و `account` موجود → استخدم `account.total_income / account.total_expenses`.
- وإلا → أبقِ `reduce` الحالي.

### B3 — بطاقات ملخص في `DistributionsPage` ✅ مؤكَّد
- إنشاء `src/components/distributions/DistributionsSummaryCards.tsx`.
- 3 بطاقات: المتاح للتوزيع / الموزَّع فعلياً (SUM distributions) / المتبقي مع شارة `عجز` إن وُجد (بناءً على `isDeficit` الموجودة).

### B4 — بطاقات عدّ المستخدمين في `UserManagementPage` ✅ مؤكَّد
- 4 بطاقات: إجمالي / ناظر / محاسب / مستفيد + واقف. يقرأ من `user_roles` الموجود في الصفحة.

### B7 — بطاقات في `MessagesPage` ✅ مؤكَّد
- 3 بطاقات: غير مقروء / مفتوحة / مغلقة. مصادر من المحادثات المحمَّلة.

### B8 — بطاقات ملخص في `ReportsPage` ✅ مؤكَّد
- استخدام `AccountsSummaryCards` بنفس مصدر بيانات `AccountsPage` (`useAccountsCalculations`) لضمان التطابق.

---

## مؤجَّل لمراجعة منفصلة (يحتاج قرار معماري)

- **B5 (`PropertiesPage` بطاقات "وحدات نشطة")** — يحتاج التحقق من وجود hook الوحدات أولاً.
- **B6 (`IncomePage` بطاقات تحصيل)** — قد تتعارض مع `useUnifiedCollectionAndIncomeSync` (قاعدة موجودة).
- **P2 (9 تحسينات)** — تجميلية، تستحق PR منفصل.
- **P1-7 جزء `useVoucherActions`** — استيراد `supabase` مباشرة في page hook. الفصل لـ data hook طبقي لكن وظيفي 100%. أؤجّله لمراجعة معمارية واحدة شاملة لكل سجل المخالفات بدلاً من إصلاح واحد معزول.

---

## الملفات الفعلية المعدَّلة

| ملف | نوع التغيير |
|------|---------|
| `src/components/accounts/AccountsSummaryCards.tsx` | إضافة Alert + شارات |
| `src/pages/dashboard/AccountsPage.tsx` | تمرير القيم الأصلية |
| `src/hooks/page/admin/reports/useAnnualReportPage.ts` | قراءة snapshot للسنة المُقفلة |
| `src/components/distributions/DistributionsSummaryCards.tsx` | **جديد** — 3 بطاقات |
| `src/pages/dashboard/DistributionsPage.tsx` | استخدام البطاقات الجديدة |
| `src/pages/dashboard/UserManagementPage.tsx` | بطاقات عدّ المستخدمين |
| `src/pages/dashboard/MessagesPage.tsx` | بطاقات المحادثات |
| `src/pages/dashboard/ReportsPage.tsx` | بطاقات ملخص |

**بدون migrations، بدون Edge Functions، بدون RLS/grants.**

## التحقق
- `bunx vitest run` — يجب بقاء جميع الاختبارات خضراء.
- فحص بصري على viewport 1319×770.

هل أبدأ التنفيذ بهذا النطاق المُدقَّق؟
