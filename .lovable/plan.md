
# إصلاح مسارات الاستيراد الديناميكي في ملفات الاختبار

## المشكلة
بعد نقل ملفات PDF إلى مجلدات فرعية، تم تحديث `vi.mock()` بالمسارات الجديدة، لكن **استدعاءات `await import()` الديناميكية داخل دوال الاختبار** بقيت على المسارات القديمة.

مثال:
```ts
// vi.mock تم تحديثه ✅
vi.mock('../core/core', () => ({ ... }));

// await import لم يُحدَّث ❌
const { finalizePdf } = await import('./core');
// يجب أن يكون:
const { finalizePdf } = await import('../core/core');
```

## التغييرات المطلوبة

### خريطة الاستبدال

| المسار القديم | المسار الجديد | الملفات المتأثرة |
|---|---|---|
| `./core` | `../core/core` | accounts, annualReport, auditLog, beneficiary, bylaws, comparison, comprehensiveBeneficiary, entities, expenses, forensicAudit, invoices, paymentInvoice, reports |
| `./accounts` | `../entities/accounts` | accounts.test.ts |
| `./annualReport` | `../reports/annualReport` | annualReport.test.ts |
| `./paymentInvoice` | `../invoices/paymentInvoice` | paymentInvoice.test.ts |

### ملف إضافي: `useHistoricalComparison.ts`
المسار `@/utils/pdf/reports/comparison` **صحيح بالفعل** — لا يحتاج تعديل. الخطأ المُبلَّغ كان من build cache قديم.

### الملفات المُعدَّلة (14 ملف اختبار)

1. `src/utils/pdf/__tests__/accounts.test.ts` — `./accounts` → `../entities/accounts` + `./core` → `../core/core`
2. `src/utils/pdf/__tests__/annualReport.test.ts` — `./annualReport` → `../reports/annualReport` + `./core` → `../core/core`
3. `src/utils/pdf/__tests__/auditLog.test.ts` — `./core` → `../core/core`
4. `src/utils/pdf/__tests__/beneficiary.test.ts` — `./core` → `../core/core`
5. `src/utils/pdf/__tests__/bylaws.test.ts` — `./core` → `../core/core`
6. `src/utils/pdf/__tests__/comparison.test.ts` — `./core` → `../core/core`
7. `src/utils/pdf/__tests__/comprehensiveBeneficiary.test.ts` — `./core` → `../core/core`
8. `src/utils/pdf/__tests__/entities.test.ts` — `./core` → `../core/core`
9. `src/utils/pdf/__tests__/expenses.test.ts` — `./core` → `../core/core`
10. `src/utils/pdf/__tests__/forensicAudit.test.ts` — `./core` → `../core/core`
11. `src/utils/pdf/__tests__/invoices.test.ts` — `./core` → `../core/core`
12. `src/utils/pdf/__tests__/paymentInvoice.test.ts` — `./paymentInvoice` → `../invoices/paymentInvoice` + `./core` → `../core/core`
13. `src/utils/pdf/__tests__/reports.test.ts` — `./core` → `../core/core`
14. `src/utils/pdf/__tests__/pdfHelpers.test.ts` — فحص إن كان يحتوي مسارات قديمة

تغيير ميكانيكي بحت (find & replace) — لا تغيير في منطق الاختبارات.
