

# خطة تنظيف الديون التقنية — 3 مهام

## التحقق المنهجي (مكتمل)

تم التأكد عبر بحث شامل أن **جميع الملفات الـ 8 المرشحة للحذف ليس لها أي مستهلك** في الكود. كذلك تم تأكيد أن `advanceTypes.ts` مستورد فقط من ملفين (`index.ts` + `useAdvanceRequests.ts`).

---

## المهام

### 1. حذف 8 ملفات stub غير مستخدمة

**0 استيرادات** من المسارات القديمة — حذف آمن 100%.

| الملف | الحجم |
|-------|-------|
| `src/hooks/financial/useMySharePage.ts` | 137B re-export |
| `src/hooks/financial/useAccountsPage.ts` | 140B re-export |
| `src/hooks/financial/usePrefetchPages.ts` | 181B re-export |
| `src/hooks/auth/webAuthnErrors.ts` | 236B re-export |
| `src/utils/printShareReport.ts` | 139B re-export |
| `src/utils/printDistributionReport.ts` | 153B re-export |
| `src/utils/loadAmiriFonts.ts` | 135B re-export |
| `src/components/GlobalSearch.tsx` | 185B re-export |

**تحديث `src/hooks/financial/index.ts`**: إزالة 3 أسطر re-export للمسارات المنقولة (`useAccountsPage`, `useMySharePage`, `usePrefetchPages`).

### 2. إعادة تسمية `advanceTypes.ts` → `useAdvanceFinance.ts`

الملف يحتوي على **5 hooks + هوك مدمج** — اسم `advanceTypes` مضلل. الأنواع تبقى في `types/advance.ts`.

- إعادة تسمية الملف
- تحديث الاستيراد في `src/hooks/financial/index.ts` (سطر 8)
- تحديث الاستيراد في `src/hooks/financial/useAdvanceRequests.ts` (سطر 21)

### 3. تصنيف `src/test/` بمجلد `integration/`

نقل 8 ملفات اندماج (Supabase/RPC) إلى `src/test/integration/`:

**تُنقل:**
- `financialIntegration.test.ts`, `fiscalYearClosure.test.ts`, `beneficiaryIsolation.test.ts`
- `edgeFunctionAuth.test.ts`, `guardSignupSecurity.test.ts`, `notificationRpcSecurity.test.ts`
- `roles-security.test.ts`, `bylawsRlsVisibility.test.ts`

**تبقى في الجذر (وحدات صرفة):**
- `activeContractsFilter`, `auditLogFilter`, `availableAmount`, `computeCollectionSummary`
- `maybeSingle`, `myShareCalculation`, `regressionFixes`, `zatcaSharedLogic`
- `setup.ts`, `vitest.d.ts`

---

## التفاصيل التقنية

- لا تأثير على البناء أو التشغيل — تغييرات هيكلية فقط
- `useContractsPage.ts` لا يحتاج تفكيك (مقسّم فعلاً)
- `SECURITY.md` سليم (تم إصلاحه سابقاً)

