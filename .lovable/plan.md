

# خطة التحسينات المتبقية — الدورة الخامسة

## نظرة عامة

3 تحسينات بسيطة فقط. لا تغييرات وظيفية. المشروع أنظف مما كان متوقعاً — استخدامات `: any` في كود الإنتاج = **1 فقط** (في `chart.tsx` من shadcn — لا يُعدّل).

---

## الخطوة 1: تصحيح استيراد الاختبار (ملف واحد)

`src/utils/pdf/__tests__/invoice.test.ts` سطر 36 يستورد `Invoice` من `@/hooks/data/invoices/useInvoices` — تغييره إلى `@/types/invoices`.

## الخطوة 2: نقل `InvoicePreviewData` إلى `src/types/invoices.ts` (4 ملفات)

- **المصدر الحالي**: `InvoicePreviewData` = type alias لـ `InvoiceTemplateData` في `components/invoices/InvoicePreviewDialog.tsx`
- **الإجراء**:
  1. إضافة `export type InvoicePreviewData = InvoiceTemplateData` إلى `src/types/invoices.ts` (مع استيراد `InvoiceTemplateData` من `invoiceTemplateUtils`)
  2. تحويل التصدير في `InvoicePreviewDialog.tsx` إلى re-export من `@/types/invoices`
  3. تحديث `useInvoicesPage.ts` ← استيراد من `@/types/invoices`
  4. تحديث `usePaymentInvoicesTab.ts` ← استيراد من `@/types/invoices`
  5. `components/invoices/index.ts` يبقى re-export (التوافق العكسي للمكونات)

## الخطوة 3: تنظيف `: any` في ملفات الاختبار (اختياري)

الـ 76 استخدام كلها تقريباً في ملفات `.test.ts/.test.tsx` — وهي مقبولة في mocks. كود الإنتاج **نظيف تماماً** (الاستخدام الوحيد في `chart.tsx` من shadcn لا يُعدّل). **لا إجراء مطلوب**.

---

## ملخص التأثير

| الخطوة | ملفات معدّلة |
|--------|-------------|
| 1: تصحيح استيراد الاختبار | 1 |
| 2: نقل `InvoicePreviewData` | 4 |
| **المجموع** | **5 ملفات** |

## التحقق

`npx tsc --noEmit` بعد التنفيذ.

