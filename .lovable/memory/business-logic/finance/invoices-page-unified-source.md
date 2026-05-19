---
name: invoices-page-unified-source
description: لوحة الفواتير لكلا الدورين تقرأ invoices + payment_invoices عبر تبويبات الكل/الإيجار/الشراء. الكتابة محصورة بمصدر purchase. الفواتير منفصلة دلالياً ووظيفياً عن المصروفات التشغيلية.
type: feature
---

# مصدر الفواتير الموحّد + الفصل عن المصروفات

## القاعدة
- لوحة الفواتير `/dashboard/invoices` و `/beneficiary/invoices` تعرضان نفس البيانات لنفس السنة المالية: `invoices` + `payment_invoices`.
- تبويبات `الكل / فواتير الإيجار / فواتير الشراء` تتحكم بالعرض.
- النوع المشترك `UnifiedInvoiceItem` و `InvoiceSourceFilter` في `src/types/invoices.ts`. القيم: `'all' | 'purchase' | 'rent'`. **ممنوع استخدام `'expense'` كمصدر** (تمت إعادة التسمية لرفع الالتباس).

## فصل الفواتير عن المصروفات
- **الفاتورة (`invoices`)** = مستند ضريبي ZATCA — قد يكون مرفقاً اختيارياً لمصروف عبر `invoices.expense_id`.
- **المصروف (`expenses`)** = سجل محاسبي تشغيلي داخلي مستقل.
- إنشاء/تعديل فاتورة شراء عبر `InvoiceUploadDialog` **لا** يُنشئ ولا يُعدّل أي صف في `expenses`، والعكس صحيح.
- العلاقة الوحيدة: `documentationRate` يحسب نسبة المصروفات التي لها فاتورة مرفقة عبر `expense_id`.
- الصفحات لا تستورد عبر الحدود: `InvoicesPage` ممنوعة من استيراد `@/components/expenses/*` أو `useExpensesPage`؛ `ExpensesPage` ممنوعة من استيراد `@/components/invoices/*` أو `useInvoicesPage` (الاستثناء الوحيد المسموح: `ExpenseAttachments` يستخدم `InvoiceViewer` لعرض المرفق فقط).

## حدود الكتابة في صفحة الفواتير
- إنشاء/تعديل/حذف/رفع ملف → مقصور على مصدر `purchase` (تبويب فواتير الشراء).
- مصدر `rent` للقراءة فقط — يُولَّد تلقائياً عبر `generate_contract_invoices`.
- تبويب `الكل` يعرض المصدرين بدون أزرار كتابة (لتفادي خلط VAT/الإجماليات).

## معايير عدم التطابق
- لو ظهر فرق في عدد الفواتير بين لوحة الناظر ولوحة المستفيد لنفس `fiscal_year_id` → خلل في فلترة المصدر أو RLS.
- `InvoiceSummaryCards` يبقى مبنياً على `invoices` فقط لتفادي خلط ضريبة الشراء بضريبة الإيجار.
- لو حذف/تعديل فاتورة غيّر صفاً في `expenses` → كسر للفصل، يجب التراجع.
