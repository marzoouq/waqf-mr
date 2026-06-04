# Stage 6 — مُقفلة ✅ (5/5)

تُوّجت بتنفيذ جميع البنود الخمسة المتبقية من تدقيق `audit-report-2026-06-03.md`.

## ما نُفِّذ

| # | البند | الحالة | الملفات |
|---|---|---|---|
| **S6-1** | `PagePerformanceCard` → Page Hook | ✅ | `usePagePerformanceCard.ts` (جديد) + UI خالص |
| **S6-2** | `FiscalYearWidget` → Page Hook | ✅ | `useFiscalYearWidget.ts` (جديد) + UI خالص |
| **S6-3** | IIFE `heatmapBounds` → `useMemo` | ✅ | `useAdminDashboardPage.ts` |
| **S6-4** | `AiAssistant` Tabs → `radiogroup` ARIA | ✅ | `AiAssistant.tsx` |
| **S6-5** | `BeneficiaryAdvanceCard` Dialog بدل التنقل | ✅ | `BeneficiaryAdvanceCard.tsx` + `useBeneficiaryDashboardPage.ts` + `BeneficiaryDashboard.tsx` |

## S6-5 — تفاصيل التنفيذ

- توسيع `useBeneficiaryDashboardPage` لإرجاع كائن `advanceContext` مُجمَّع (10 حقول) — كل الحقول من `dashData` نفسه، **صفر استدعاءات RPC إضافية**.
- إعادة استخدام `AdvanceRequestDialog` من `src/components/beneficiary/my-share/` كما هو دون أي تعديل.
- البطاقة تعرض زر معطّل برسالة واضحة عند `!enabled` أو `!isFiscalYearActive` (بدلاً من الإخفاء — تحسين اكتشافية).
- رابط ثانوي «عرض السجل الكامل» → `/beneficiary/my-share`.
- Realtime موجود مسبقاً على `advance_requests` (السطور 88-93) → `pendingAdvanceCount` يتحدّث تلقائياً.

## معلَّق بقرار منتج (خارج النطاق التقني)

- إفصاح المحاسب على `FiscalYearWidget` (`totalIncome` + `contractualRevenue`) — يحتاج قرار سياسة.

## مرجع: ما تم في Stages 1-5

- **Stages 1-3**: توحيد المنطق المالي، RPC، تطبيع `available_amount` ≥ 0
- **Stage 4**: `varianceReport.ts` + بطاقة #9 اتساق اللوحات
- **Stage 5**: E2E helpers + 3 ملفات اختبار + بطاقة #10 تدقيق رقمي
- **Stage 6**: Page Hook Pattern على بطاقات الناظر + إصلاح ARIA + Dialog السلفة المحلي
