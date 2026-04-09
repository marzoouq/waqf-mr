

# خطة تنفيذ تحسينات هيكل المشروع + إصلاح خطأ 401

## الخلاصة
6 خطوات مرتبة حسب الأهمية: إصلاح خطأ اللوحة أولاً، ثم تنظيف الملفات المهملة، ثم نقل الدالة المفقودة.

---

## الخطوات

### 1. إصلاح خطأ 401 في `dashboard-summary` (عاجل)

**المشكلة**: عند انتهاء صلاحية الجلسة، يُرسل `supabase.functions.invoke` توكن منتهي الصلاحية → 401 → رسالة خطأ عامة للمستخدم.

**الإصلاح**:
- **في `useDashboardSummary.ts`**: إضافة كشف خطأ 401 — عند حدوثه، استدعاء `supabase.auth.signOut()` لتنظيف الجلسة الميتة وتوجيه المستخدم لتسجيل الدخول بدلاً من عرض رسالة خطأ عامة.
- **في `FiscalYearContext.tsx`**: إضافة نفس المعالجة في `prefetchQuery` — التقاط 401 وتسجيل خروج تلقائي.
- **في Edge Function**: تحويل المصادقة من `getUser()` إلى `getClaims()` لتقليل زمن الاستجابة (يتحقق من JWT محلياً بدلاً من استدعاء الخادم).

### 2. حذف `menuLabels.ts` (لا مستوردين)

- حذف `src/components/layout/menuLabels.ts` — الملف مهمل ولا يوجد أي استيراد له.

### 3. تحديث مستوردي `contractForm.types.ts` ثم حذفه

- تحديث 5 ملفات لاستيراد من `@/types/forms/contract` مباشرة:
  - `ContractRentalModeSection.tsx`
  - `ContractPaymentSection.tsx`
  - `ContractTenantIdSection.tsx`
  - `ContractFormDialog.tsx`
  - `src/components/contracts/index.ts`
- حذف `src/components/contracts/contractForm.types.ts`

### 4. نقل `formatPercentage` من `lib/utils.ts` إلى `utils/format/`

- إضافة `formatPercentage` إلى `src/utils/format/format.ts`
- تصديرها من `src/utils/format/index.ts`
- تحديث 4 ملفات مستوردة:
  - `BeneficiaryCard.tsx`
  - `BeneficiaryDistributionTable.tsx`
  - `DistributeDialog.tsx`
  - `AccountsBeneficiariesTable.tsx`
- حذف `formatPercentage` من `src/lib/utils.ts`

### 5. التحقق بـ `npx tsc --noEmit`

- تشغيل TypeScript للتأكد من عدم وجود أخطاء بعد كل التعديلات.

### 6. (اختياري — بعد الموافقة) تقسيم `useWebAuthn.ts`

- تقسيم إلى 3 هوكات: `useWebAuthnRegister`, `useWebAuthnAuth`, `useWebAuthnManage`
- هوك رئيسي يجمعها

---

## التفاصيل التقنية

| الملف | التغيير |
|-------|---------|
| `supabase/functions/dashboard-summary/index.ts` | `getUser()` → `getClaims()` |
| `src/hooks/data/financial/useDashboardSummary.ts` | معالجة 401 → signOut |
| `src/contexts/FiscalYearContext.tsx` | معالجة 401 في prefetch |
| `src/components/layout/menuLabels.ts` | **حذف** |
| `src/components/contracts/contractForm.types.ts` | **حذف** بعد تحديث 5 ملفات |
| `src/utils/format/format.ts` | إضافة `formatPercentage` |
| `src/utils/format/index.ts` | تصدير `formatPercentage` |
| `src/lib/utils.ts` | حذف `formatPercentage` |
| 4 ملفات مكونات | تحديث مسار استيراد `formatPercentage` |

