## الجولات — حالة التنفيذ

- ✅ الجولة 3 / 3-ب (P1): Zod في 7 Edge Functions + getUser + toast factoring
- ✅ الجولة 4 (P2):
  - A2: نقل الحسابات إلى طبقة domain
    - `src/hooks/domain/financial/useIncomeComparison.ts` ← raw من `useIncomeComparisonRaw`
    - `src/hooks/domain/financial/useAdvanceCalculations.ts` ← raw من `useMyBeneficiaryFinanceRaw`
    - إعادة تصدير للتوافق العكسي حفاظاً على المستهلكين
  - A3: تقليل الحجم
    - `useAccountsPage.ts` 216→204 سطر (overdueSplit مستخرج)
    - `useContractForm.ts` 216→151 سطر (builders إلى `utils/contracts/contractFormBuilders.ts`)
  - B3: `health-check` يتطلب الآن `X-Health-Secret` (تمت إضافة السر)
- ✅ الجولة 5 (P3):
  - A4: `inferMutationArg.ts:14` — eslint-disable + شرح موجود
  - B4: `auth-email-hook/index.ts:80-81` — تعليق CORS=`*` موجود

## متبقّي للجولة 6 (توثيق)
- `.lovable/audit-2026-05-27.md` تقرير شامل
- تحديث `mem://` بقاعدتي: no-toast-in-data-hooks + edge-functions-zod-required

## ملاحظات
- tsc يمر بنظافة
- 3 اختبارات معلّقة سابقة (AuthContext mock — تم تحديثه؛ PDF integration — غير مرتبط)
