

# تقرير فحص وإصلاح مشاكل الفواتير

## المشاكل المكتشفة

### 1. [حرج] النص العربي مشوّه في PDF المُولّد — `loadArabicFont`
الفاتورة المرفقة تُظهر حروفاً مشوّهة (`þ"þÌþÓþªþßþ•` بدل النص العربي). النص الإنجليزي والأرقام تظهر صحيحة. السبب: خط Amiri يُحمّل كـ TTF لكن jsPDF 4.2.0 لا يدعم تشكيل الحروف العربية (Arabic Shaping) — الحروف تظهر منفصلة ومشفّرة بشكل خاطئ.

**الإصلاح:** إضافة مكتبة `arabic-reshaper` (أو تطبيق reshaping يدوي) لمعالجة النص العربي قبل تمريره لـ jsPDF. هذا يحول الحروف المنفصلة إلى أشكالها المتصلة الصحيحة ويعكس ترتيب الأحرف (RTL).

### 2. [حرج] سياسة رفع الملفات مفقودة — Storage INSERT policy
لا توجد سياسة INSERT على storage bucket `invoices`. هذا يمنع الأدمن والمحاسب من رفع ملفات الفواتير أو حفظ PDF المُولّد. وظيفة `generatePaymentInvoicePDF` تحاول upload بعد التوليد وتفشل صامتةً (تسقط في catch وتحفظ محلياً فقط).

**الإصلاح:** إضافة سياسة INSERT تسمح للأدمن والمحاسب برفع الملفات + سياسة UPDATE للمحاسب.

### 3. [متوسط] جدول `invoice_items` غير مُدمج مع المعاينة و PDF
جدول `invoice_items` أُنشئ لتخزين بنود الفاتورة المتعددة، لكن:
- `buildPaymentPreviewData()` يُولّد بنداً واحداً ثابتاً ("إيجار — دفعة X") بدلاً من جلب البنود من الجدول
- `handleDownloadPdf()` لا يمرر `lineItems` أو `allowances/charges`

**الإصلاح:** في `PaymentInvoicesTab` و `InvoicesPage`، جلب `invoice_items` من قاعدة البيانات واستخدامها في بناء بيانات المعاينة والتصدير.

### 4. [منخفض] عرض المعاينة على الموبايل (411px)
`InvoicePreviewDialog` يستخدم `max-w-4xl` مع `max-h-[90vh]` — على شاشة 411px القالب الاحترافي بجدوله الواسع (8 أعمدة) قد يتجاوز العرض المتاح.

**الإصلاح:** إضافة `overflow-x-auto` للمحتوى الداخلي وتحسين responsive للجدول.

---

## خطة التنفيذ

| # | المهمة | الملفات | التعقيد |
|---|--------|---------|---------|
| 1 | إضافة Storage INSERT + UPDATE policies | Migration SQL | منخفض |
| 2 | إصلاح Arabic text shaping في PDF | `src/utils/pdf/core.ts` + إضافة reshaper | متوسط |
| 3 | دمج `invoice_items` في المعاينة والتصدير | `PaymentInvoicesTab.tsx`, `InvoicesPage.tsx`, `usePaymentInvoices.ts` | متوسط |
| 4 | تحسين responsive للمعاينة | `InvoicePreviewDialog.tsx` | منخفض |

### تفاصيل تقنية

**المهمة 1 — Storage policies:**
```sql
CREATE POLICY "Admins can upload invoices" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can upload invoices" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can update invoices" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'accountant'));
```

**المهمة 2 — Arabic reshaping:**
إنشاء دالة `reshapeArabic(text)` في `pdf/core.ts` تعالج:
- تحويل الحروف العربية لأشكالها المتصلة (initial, medial, final, isolated)
- عكس ترتيب الحروف للعرض الصحيح RTL في jsPDF
- استدعاء الدالة في كل نقطة يُكتب فيها نص عربي (`doc.text(...)` و auto