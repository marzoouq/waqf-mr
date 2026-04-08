

# خطة إصلاح المشاكل المعمارية المؤكدة — 7 خطوات

## ملخص
7 مشاكل مؤكدة، ~15 ملف متأثر، صفر تغيير في السلوك الخارجي.

---

## الخطوة 1: حذف الملف الشارد 🔴
حذف `/useMySharePage.ts` من جذر المشروع — نسخة مكررة من `src/hooks/page/beneficiary/useMySharePage.ts`.

| ملف | إجراء |
|-----|-------|
| `useMySharePage.ts` (جذر) | حذف |

---

## الخطوة 2: فك انعكاس `logger.ts` ← `hooks/data/` 🔴

**المشكلة**: `lib/logger.ts` يستورد `logAccessEvent` من `hooks/data/audit/useAccessLog` — طبقة البنية التحتية تعتمد على طبقة البيانات.

**الحل**: نقل دالة `logAccessEvent` من `useAccessLog.ts` إلى `src/lib/services/accessLogService.ts` (ملف جديد). تحديث الاستيرادات في `logger.ts` و `useAccessLog.ts`.

| ملف | إجراء |
|-----|-------|
| `src/lib/services/accessLogService.ts` | إنشاء — نقل `logAccessEvent` هنا |
| `src/lib/logger.ts` | تعديل — استيراد من `lib/services/` |
| `src/hooks/data/audit/useAccessLog.ts` | تعديل — إعادة تصدير من `lib/services/` للتوافق |

---

## الخطوة 3: مركزة `timingSafeEqual` 🟠

**المشكلة**: التنفيذ مكرر inline في `check-contract-expiry/index.ts` فقط.

**الحل**: إنشاء `supabase/functions/_shared/auth.ts` ونقل الدالة إليه.

| ملف | إجراء |
|-----|-------|
| `supabase/functions/_shared/auth.ts` | إنشاء — `timingSafeEqual` + تصدير |
| `supabase/functions/check-contract-expiry/index.ts` | تعديل — استيراد من `_shared/auth.ts` |

---

## الخطوة 4: استخراج قواميس التدقيق من hook إلى utils 🟠

**المشكلة**: `utils/pdf/entities/auditLog.ts` يستورد `getTableNameAr`/`getOperationNameAr`/`AuditLogEntry` من hook.

**الحل**: إنشاء `src/utils/format/auditLabels.ts` بالقواميس والأنواع. تحديث المستوردين.

| ملف | إجراء |
|-----|-------|
| `src/utils/format/auditLabels.ts` | إنشاء — القواميس + الدوال + `AuditLogEntry` type |
| `src/hooks/data/audit/useAuditLog.ts` | تعديل — استيراد وإعادة تصدير من `auditLabels.ts` |
| `src/utils/pdf/entities/auditLog.ts` | تعديل — استيراد من `utils/format/auditLabels` |
| `src/utils/format/index.ts` | تعديل — إضافة تصدير `auditLabels` |

---

## الخطوة 5: نقل `useBeneficiaryDashboardData` للطبقة الصحيحة 🟠

**المشكلة**: Hook يجمع بيانات لوحة التحكم (orchestration) موجود في `hooks/data/` بدلاً من `hooks/page/`.

**الحل**: نقل إلى `src/hooks/page/beneficiary/useBeneficiaryDashboardData.ts`. تحديث 7 مستوردين.

| ملف | إجراء |
|-----|-------|
| `src/hooks/page/beneficiary/useBeneficiaryDashboardData.ts` | إنشاء (نقل) |
| `src/hooks/data/beneficiaries/useBeneficiaryDashboardData.ts` | حذف |
| `src/hooks/data/beneficiaries/index.ts` | تعديل — إزالة التصدير |
| 7 ملفات في `hooks/page/beneficiary/` | تعديل مسار الاستيراد |

---

## الخطوة 6: توحيد pipeline الأخطاء 🟡

**المشكلة**: `logger.ts` يستدعي `logAccessEvent` مباشرة، و `errorReporter.ts` يستدعي `supabase.rpc` مباشرة — مساران متوازيان.

**الحل**: جعل `logger.error` في production يستدعي `reportClientError` من `errorReporter.ts` فقط (الذي يتعامل بالفعل مع fallback محلي). إزالة الاستدعاء المباشر لـ `logAccessEvent` من logger.

| ملف | إجراء |
|-----|-------|
| `src/lib/logger.ts` | تعديل — استبدال `logAccessEvent` بـ `reportClientError` |

*ملاحظة*: هذه الخطوة تعتمد على الخطوة 2 — بعد نقل `logAccessEvent`، يصبح logger يعتمد فقط على `errorReporter`.

---

## الخطوة 7: إضافة اختبار `distributionSummary.test.ts` 🟡

إنشاء `src/utils/financial/distributionSummary.test.ts` يغطي:
- `filterDistributionsByFiscalYear` — 4 حالات (مع حساب، بدون حساب + سنة محددة، بدون حساب + "all"، بدون حساب + بدون سنة)
- `summarizeDistributions` — 2 حالة (مزيج paid/pending، مصفوفة فارغة)

| ملف | إجراء |
|-----|-------|
| `src/utils/financial/distributionSummary.test.ts` | إنشاء |

---

## ملخص التأثير

| الخطوة | جديد | حذف | تعديل |
|--------|------|-----|-------|
| 1 | 0 | 1 | 0 |
| 2 | 1 | 0 | 2 |
| 3 | 1 | 0 | 1 |
| 4 | 1 | 0 | 3 |
| 5 | 1 | 1 | 8 |
| 6 | 0 | 0 | 1 |
| 7 | 1 | 0 | 0 |
| **المجموع** | **5** | **2** | **15** |

