
المشكلة واضحة من الكود: المعاينة داخل الواجهة تستخدم القوالب الجديدة في `InvoiceTemplates.tsx`، لكن زر تحميل PDF لا يصدّر نفس المعاينة، بل يستدعي مساراً آخر أقدم.

1. سبب المشكلة الجذري
- `InvoicePreviewDialog` يعرض:
  - `ProfessionalTemplate`
  - `SimplifiedTemplate`
- لكن `onDownloadPdf` لا يحول هذه المعاينة إلى PDF.
- في صفحة الفواتير `InvoicesPage.tsx` يتم الضغط على التحميل ثم استدعاء `useGenerateInvoicePdf()`.
- هذا يستدعي الوظيفة الخلفية `generate-invoice-pdf`.
- هذه الوظيفة تولّد PDF عبر `pdf-lib` داخل `supabase/functions/generate-invoice-pdf/index.ts`.
- هذا الملف يحتوي قالب PDF مستقل وقديم، وليس القالب الجديد الموجود في React.
- كذلك إذا كانت الفاتورة لديها `file_path` موجود مسبقاً، الوظيفة لا تعيد التوليد أصلاً، بل تُرجع:
  - `"already has file"`
- وهذا يفسّر لماذا بعد فشل المعاينة أو ظهور التحذير “رجعت نفس المشكلة”: يتم الرجوع إلى ملف PDF المخزن مسبقاً أو إلى مولّد PDF القديم، وليس إلى تصميم المعاينة الحالي.

2. ماذا سأبني
سأوحّد مسار التصدير مع المعاينة حتى تصبح النتيجة دائماً من نفس التصميم الظاهر للمستخدم.

3. خطة التنفيذ المقترحة
- تحديث `InvoicePreviewDialog`
  - تمرير القالب المختار الحالي (`professional` أو `simplified`) إلى دالة التحميل.
  - بدلاً من `onDownloadPdf?: () => void` يصبح التوقيع مرتبطاً بالقالب الحالي.
- تحديث `InvoicesPage.tsx`
  - عند التحميل من المعاينة، نرسل:
    - معرف الفاتورة
    - القالب المختار
    - خيار لإجبار إعادة التوليد عند الحاجة
  - وإذا كانت الفاتورة مرفقة بملف قديم، لا نكتفي به تلقائياً عند طلب التحميل من المعاينة.
- تحديث `useGenerateInvoicePdf` في `src/hooks/useInvoices.ts`
  - دعم بارامترات إضافية مثل:
    - `template`
    - `forceRegenerate`
- تحديث الوظيفة الخلفية `supabase/functions/generate-invoice-pdf/index.ts`
  - إما:
    1. إعادة بناء PDF ليطابق القالبين الجديدين قدر الإمكان، أو
    2. على الأقل جعلها تقرأ `template` وتستخدم قالبين حديثين بدلاً من القالب القديم الواحد.
  - الأهم: عند `forceRegenerate` لا تتخطى الفاتورة إذا كان `file_path` موجوداً.
- إضافة اختبارات
  - اختبار أن التحميل من المعاينة يمرر اسم القالب الصحيح.
  - اختبار أن `forceRegenerate` يمنع استخدام الملف القديم.
  - اختبار أن الرد `"already has file"` لا يحدث عندما يطلب المستخدم إعادة توليد من المعاينة.

4. القرار التصميمي الأفضل
أفضل حل عملي هو هذا:
- المعاينة تبقى في React كما هي.
- التصدير الخلفي يدعم نفس نوعي القوالب:
  - professional
  - simplified
- وعند التحميل من نافذة المعاينة يتم إجبار إعادة التوليد لأن نية المستخدم هنا هي “حمّل ما أراه الآن”.

5. ملاحظة تقنية مهمة
يوجد حالياً نظامان مختلفان للفواتير:
- فواتير صفحة الفواتير العامة:
  - تعتمد على `generate-invoice-pdf` القديم
- فواتير دفعات العقود في `PaymentInvoicesTab`:
  - تعتمد على `generatePaymentInvoicePDF` من `src/utils/pdf/paymentInvoice.ts`
  - وهذا أيضاً مسار مختلف ثالث

لذلك الإصلاح الصحيح ليس مجرد تعديل زر واحد، بل توحيد منطق التصدير أو على الأقل جعل كل زر تحميل مربوطاً بالقالب المرئي الصحيح في كل شاشة.

6. النتيجة المتوقعة بعد التنفيذ
- إذا غيّر المستخدم القالب داخل المعاينة، ملف PDF يخرج بنفس القالب.
- لا يعود النظام إلى ملف قديم مخزن إلا إذا كان ذلك مقصوداً صراحة.
- تختفي حالة “المعاينة جديدة لكن التصدير قديم”.

7. التفاصيل التقنية
```text
الوضع الحالي:
Preview Dialog (React new templates)
        ↓
Download button
        ↓
useGenerateInvoicePdf()
        ↓
generate-invoice-pdf edge function
        ↓
Old pdf-lib layout or existing stored file

الوضع المطلوب:
Preview Dialog (React new templates + selected template)
        ↓
Download button passes template + forceRegenerate
        ↓
useGenerateInvoicePdf(payload)
        ↓
generate-invoice-pdf(template, forceRegenerate)
        ↓
PDF matches selected preview template
```

8. نطاق الملفات المرجح
- `src/components/invoices/InvoicePreviewDialog.tsx`
- `src/pages/dashboard/InvoicesPage.tsx`
- `src/hooks/useInvoices.ts`
- `supabase/functions/generate-invoice-pdf/index.ts`
- وربما اختبارات:
  - `src/pages/dashboard/InvoicesPage.test.tsx`
  - `src/test/edgeFunctionAuth.test.ts`

9. المخاطر التي سأنتبه لها
- عدم كسر التوليد الجماعي الحالي للفواتير.
- الحفاظ على صلاحيات الوصول الحالية.
- عدم إعادة استخدام ملف قديم عند التصدير من المعاينة.
- التمييز بين “عرض ملف مرفق موجود” و”إعادة توليد PDF من القالب الحالي”.

