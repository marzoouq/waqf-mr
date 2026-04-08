
# نتائج التحقق من تقرير التدقيق المعماري — 25 ادعاء مقابل الكود الفعلي

## البنود المرفوضة (أُصلحت أو غير صحيحة) — 15 بند

| # | الادعاء | الحقيقة |
|---|---------|---------|
| 1 | `timingSafeEqual` محلي في `check-contract-expiry` | **خطأ** — موجودة فقط في `_shared/auth.ts` (9 مطابقات، ملف واحد). صفر نسخ محلية |
| 2 | `logger.ts` يستورد من hooks | **أُصلح سابقاً** — يستورد فقط من `@/lib/errorReporter` |
| 3 | ازدواجية `payment_type` switch | **أُصلح** — دالة `getPaymentCountFromMonths` مشتركة (سطر 11-18) تُستخدم في كلا المكانين (سطر 117 و 134) |
| 4 | `useRoleRedirect` في `hooks/ui/` | **أُصلح** — في `src/hooks/auth/useRoleRedirect.ts` ومُصدَّر من `hooks/auth/index.ts` سطر 17 |
| 6 | `TABLE_NAMES_AR` مدفونة في hook | **أُصلح** — نُقلت إلى `utils/format/auditLabels.ts`. الـ hook يُعيد تصديرها فقط (سطر 6) |
| 7 | `statusLabel` غير مغلّفة بـ `useCallback` | **أُصلح** — مستخرجة كدالة module-level ثابتة (سطر 21-28) خارج الـ hook |
| 8 | `formatDate` wrapper زائد في `auditLog.ts` | **أُصلح** — الملف يستخدم `fmtDate` مباشرة (سطر 12)، لا وجود لـ `formatDate` wrapper |
| 9 | `useCloseFiscalYear` يلتهم أخطاء صامتاً | **أُصلح** — `defaultNotify.error(...)` موجود في `onError` (سطر 46) |
| 16 | `ErrorBoundary` يحتوي على `Test explosion` guard | **أُصلح** — `componentDidCatch` لا يحتوي على أي شرط تجاهل |
| 17 | `PwaUpdateNotifier` يستخدم `toast.success` | **أُصلح** — يستخدم `defaultNotify.success` (سطر 73) |
| 18 | `VAT_KEYWORDS` dead code | **خطأ** — مستخدمة فعلاً في سطر 121 لفلترة مصروفات الضريبة |
| 23 | `totalBeneficiaryPercentage` غير مغلّف بـ `useMemo` | **أُصلح** — مغلّف بـ `useMemo` (سطر 160) |
| 5 | `useDashboardRealtime`/`useRealtimeAlerts` في `hooks/ui/` | **مقبول** — تُشغّل toasts و invalidation (وظيفة UI-facing). تستورد من `lib/realtime/` |
| 10 | `useIdleTimeout` في `hooks/ui/` | **مقبول** — hook UI بحت (timers + DOM events)، لا يحتوي على منطق auth |
| 11 | `useIncomeComparison` بدون `enabled` | **مقبول** — يُستخدم فقط في مكوّن واحد (صفحة التقرير السنوي) لذا `enabled` غير ضرورية |

---

## البنود الحقيقية المتبقية — 3 بنود فقط

### 🟠 1. `useDistributionHistory` بدون `enabled` flag
**الملف:** `src/hooks/data/financial/useDistributionHistory.ts` سطر 24

يستقبل `beneficiaryId: string` بدون guard. المستدعي (`DistributionHistory.tsx` سطر 16) يمرر `beneficiary.id` الذي قد يكون سلسلة فارغة نظرياً. إضافة `enabled: !!beneficiaryId` تمنع استعلام فارغ.

**التعديل:** سطر واحد — إضافة `enabled: !!beneficiaryId` بعد `staleTime`.

---

### 🟠 2. `usePropertyPerformance` لا يمرر `allocationMap`
**الملف:** `src/hooks/financial/usePropertyPerformance.ts` سطر 63-69

`computePropertyFinancials` تقبل `allocationMap` اختيارياً (سطر 65 في `usePropertyFinancials.ts`). صفحة `usePropertiesPage` تمررها، لكن `usePropertyPerformance` لا يمررها — مما يعني أن أداء العقارات يُحسب من `rent_amount` الكامل بدلاً من المبلغ المخصص للسنة.

**التعديل:** إضافة `allocationMap` كمعامل اختياري لـ `usePropertyPerformance` وتمريره إلى `computePropertyFinancials`.

---

### 🟡 3. `advancedFilters.types.ts` داخل `components/`
**الملف:** `src/components/filters/advancedFilters.types.ts`

أنواع `FilterState` و `EMPTY_FILTERS` هي domain types لا تنتمي لمجلد components. النقل إلى `src/types/filters.ts` يُحسّن التنظيم.

**التعديل:** نقل الملف + تحديث الاستيرادات.

---

## ملخص التنفيذ

| # | المشكلة | الأولوية | الملفات |
|---|---------|---------|---------|
| 1 | إضافة `enabled` guard لـ `useDistributionHistory` | 🟠 | 1 |
| 2 | تمرير `allocationMap` في `usePropertyPerformance` | 🟠 | 1 (+المستدعين) |
| 3 | نقل `advancedFilters.types.ts` إلى `src/types/` | 🟡 | 2-3 |

**من أصل 25 ادعاء: 15 أُصلحت/خاطئة، 7 مقبولة معمارياً، 3 حقيقية.**

المشروع في حالة إنتاجية نظيفة. التحسينات المتبقية محلية وبسيطة.
