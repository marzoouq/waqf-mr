# Stage 6 — مُقفلة ✅

تُوّجت بتنفيذ 4 من 5 بنود متبقية من تدقيق `audit-report-2026-06-03.md`.

## ما نُفِّذ

| # | البند | الحالة | الملفات |
|---|---|---|---|
| **S6-1** | `PagePerformanceCard` → Page Hook | ✅ | `usePagePerformanceCard.ts` (جديد) + UI خالص |
| **S6-2** | `FiscalYearWidget` → Page Hook | ✅ | `useFiscalYearWidget.ts` (جديد) + UI خالص |
| **S6-3** | IIFE `heatmapBounds` → `useMemo` | ✅ | `useAdminDashboardPage.ts` |
| **S6-4** | `AiAssistant` Tabs → `radiogroup` ARIA | ✅ | `AiAssistant.tsx` (إصلاح إمكانية الوصول) |

**التحقق:** 18 ملف اختبار / 156 اختباراً ✅ (E2E + diagnostics + page hooks).

## بنود مؤجَّلة بقرار

### S6-5 — `BeneficiaryAdvanceCard` Dialog بدل التنقل ⏸️

**السبب:** `AdvanceRequestDialog` الموجود في `src/components/beneficiary/my-share/` يتطلب **9 خصائص** (`beneficiaryId`, `beneficiaryName`, `fiscalYearId`, `estimatedShare`, `paidAdvances`, `carryforwardBalance`, `isFiscalYearActive`, `minAmount`, `maxPercentage`) — بينما `BeneficiaryAdvanceCard` يستقبل فقط `pendingAdvanceCount`.

**الخيارات للتنفيذ المستقبلي:**
1. توسيع `useBeneficiaryDashboardPage` لتمرير كل البيانات + الإعدادات إلى البطاقة (مفضّل — يحافظ على Container/Presentational)
2. إنشاء غلاف خفيف `BeneficiaryAdvanceCardContainer` يجلب البيانات بنفسه (خرق Container/Presentational)

يحتاج قرار منتج: هل التنقل الحالي إلى صفحة "حصتي" مقبول للسلوك القياسي؟ (يعرض كل تفاصيل الحصة قبل الطلب — قد يكون UX أفضل).

### معلَّق بقرار منتج (خارج النطاق التقني)

- إفصاح المحاسب على `FiscalYearWidget` (`totalIncome` + `contractualRevenue`) — يحتاج قرار سياسة.

## أعمال Stage 6 الكاملة

### ملفات جديدة (2)
```text
src/hooks/page/admin/dashboard/usePagePerformanceCard.ts
src/hooks/page/admin/dashboard/useFiscalYearWidget.ts
```

### ملفات معدَّلة (4)
```text
src/components/dashboard/views/PagePerformanceCard.tsx    ← UI خالص
src/components/dashboard/widgets/FiscalYearWidget.tsx     ← UI خالص
src/hooks/page/admin/dashboard/useAdminDashboardPage.ts   ← useMemo بدل IIFE
src/components/dashboard/AiAssistant.tsx                  ← radiogroup ARIA
```

---

## مرجع: ما تم في Stages 1-5

- **Stages 1-3**: توحيد المنطق المالي، RPC، تطبيع `available_amount` ≥ 0
- **Stage 4**: `varianceReport.ts` + بطاقة #9 اتساق اللوحات
- **Stage 5**:
  - E2E helpers + 3 ملفات اختبار (ناظر/مستفيد/محاسب)
  - بطاقة #10 "تدقيق رقمي DB↔RPC↔UI" (4 فحوصات)
- **Stage 6** (هذه): تطبيق Page Hook Pattern على بطاقات الناظر + إصلاح ARIA
