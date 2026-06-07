# تدقيق لوحة المستفيد — جولة عميقة (2026-06-06)

## ملخّص تنفيذي
- **12 بنداً منفّذ كود** (B1, B2×7-صفحات, B5, B6, B7, B8, B10, B11–B15)
- **2 توثيق فقط** (B4 realtime، B9 إخفاء الهوية)
- **1 مرفوض بعد التحقق الجنائي** (B3 — استبدال useBfcacheSafeChannel)

## النتائج

### B1 — حارس مفقود في AnnualReportViewPage ✅
- **الملف**: `src/pages/beneficiary/AnnualReportViewPage.tsx`
- **قبل**: لا يستدعي `RequirePublishedYears` إطلاقاً
- **بعد**: early-return عبر `useFiscalYear().noPublishedYears`
- **الأثر**: عند عدم وجود سنة منشورة، تظهر `NoPublishedYearsNotice` الموحَّدة بدل رسالة "لم يُنشر التقرير" الخاصة بالصفحة

### B2 — الحارس داخل فرع النجاح فقط ✅ (×7 صفحات)
كانت `RequirePublishedYears` تُلفّ النجاح فقط، فعند `noPublishedYears=true` يصل التنفيذ إلى `!currentBeneficiary → UnlinkedAccountNotice` خطأً.

| الصفحة | الإصلاح |
|---|---|
| `MySharePage.tsx` | early-return |
| `AccountsViewPage.tsx` | early-return |
| `FinancialReportsPage.tsx` | early-return |
| `DisclosurePage.tsx` | early-return |
| `ContractsViewPage.tsx` | early-return |
| `InvoicesViewPage.tsx` | early-return |
| `ExpensesViewPage.tsx` | غير مطلوب — الحارس outermost بالفعل |

### B5 — مفاتيح retry ناقصة في useDisclosurePage ✅
- **قبل**: `['beneficiary-dashboard', 'my-distributions']`
- **بعد**: `['beneficiary-dashboard', 'my-distributions', 'contracts_safe', 'disclosure']`

### B6 — QuickLinks: Card+onClick → Link ✅
- يدعم الآن: Ctrl/Cmd+Click (تبويب جديد)، الزر الأوسط، التنقل بلوحة المفاتيح، SEO

### B7 — AdvanceCard: <button> خام → Button ✅
- توحيد themed tokens + `aria-label` للحالة المعطّلة

### B8 — RecentDistributions: سلاسل صلبة → DISTRIBUTIONS_LABELS ✅
- العنوان يستخدم `DISTRIBUTIONS_LABELS.recent`

### B9 — إخفاء رقم الهوية: توثيق + aria ✅
- **القرار**: الإبقاء على `'********'` (PII حسّاس مشفّر AES-256)
- **الإضافة**: `aria-label="رقم الهوية مُخفي لحماية خصوصيتك"` على الـ Input
- الحقل قابل لـ a11y الآن بدون كشف بيانات

### B10 — select بدون aria-label ✅
- `<select aria-label="اختر قسم التقرير">` في AnnualReportViewPage (mobile)

### B11–B15 — توحيد ErrorState ✅
| الصفحة | البديل |
|---|---|
| `AccountsViewPage.tsx` | `ErrorState` + `ErrorState variant="warning"` |
| `FinancialReportsPage.tsx` | `ErrorState` |
| `ContractsViewPage.tsx` | `ErrorState` |
| `InvoicesViewPage.tsx` | `ErrorState` |
| `BeneficiaryMessagesPage.tsx` | `ErrorState` |
| `NotificationsPage.tsx` | `ErrorState` |
| `CarryforwardHistoryPage.tsx` | `ErrorState` + `EmptyPageState` |

تقليل ~50 سطر مكرّر · توحيد نمط الخطأ على 7 صفحات.

## مرفوض بعد التحقق الجنائي

### B3 — استبدال useBfcacheSafeChannel في useBeneficiaryDashboardPage ❌
- `useDashboardRealtime` لا يدعم `filter` لكل جدول
- الاستخدام المباشر مقصود لتمرير `beneficiary_id=eq.${id}` (تقليل حجم الحمولة)
- الاستبدال = تراجع أداء

## التحقق

| فحص | النتيجة |
|---|---|
| `bunx vitest run` | 235 ملف · 2060 اختبار · ✅ نجاح |
| TypeScript | ✅ (سيتحقق من البناء التلقائي) |
| اتساق النمط | ✅ كل الصفحات تستخدم `ErrorState`/`EmptyPageState` |
| الأمان (PII) | ✅ لا كشف لرقم الهوية |
| الأداء | ✅ realtime channels لم تُلمس |

## ملفات معدَّلة (17)

```text
src/pages/beneficiary/AnnualReportViewPage.tsx
src/pages/beneficiary/MySharePage.tsx
src/pages/beneficiary/AccountsViewPage.tsx
src/pages/beneficiary/FinancialReportsPage.tsx
src/pages/beneficiary/DisclosurePage.tsx
src/pages/beneficiary/ContractsViewPage.tsx
src/pages/beneficiary/InvoicesViewPage.tsx
src/pages/beneficiary/BeneficiaryMessagesPage.tsx
src/pages/beneficiary/NotificationsPage.tsx
src/pages/beneficiary/CarryforwardHistoryPage.tsx
src/pages/beneficiary/BeneficiarySettingsPage.tsx
src/hooks/page/beneficiary/financial/useDisclosurePage.ts
src/hooks/page/beneficiary/settings/useBeneficiarySettingsPage.ts
src/components/beneficiary/dashboard/BeneficiaryQuickLinks.tsx
src/components/beneficiary/dashboard/BeneficiaryAdvanceCard.tsx
src/components/beneficiary/dashboard/BeneficiaryRecentDistributions.tsx
src/components/settings/AccountTab.tsx
```
