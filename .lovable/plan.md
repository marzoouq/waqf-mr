

# إصلاح دالة توليد PDF للفواتير

## المشكلة المكتشفة

الدالة الحالية `generate-invoice-pdf` تستخدم مكتبة `jsPDF` عبر `esm.sh`، وهذه المكتبة تعتمد على كائنات DOM مثل `document` و `window` غير المتوفرة في بيئة Deno Edge Runtime. هذا يعني أن الدالة ستفشل عند الاستدعاء الفعلي.

## الحل

إعادة كتابة دالة توليد PDF باستخدام **بنية PDF الخام** (Raw PDF byte construction) بدون أي مكتبات خارجية تعتمد على DOM. سيتم بناء ملف PDF صالح يدوياً باستخدام مواصفات PDF 1.4.

## محتوى ملف PDF المولّد

- ترويسة: "WAQF INVOICE" مع بيانات الوقف (بالإنجليزية لتوافق الخطوط)
  - Waqf Marzouq bin Ali Al-Thubayti
  - Deed No: 411209707
  - Court: Personal Status Court - Taif
  - Administrator: Abdullah bin Marzouq bin Ali Al-Thubayti
- جدول بسيط: رقم الفاتورة، النوع، المبلغ، التاريخ، الوصف، الحالة
- تذييل: تاريخ التوليد

## التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/generate-invoice-pdf/index.ts` | إعادة كتابة توليد PDF بدون jsPDF، باستخدام بنية PDF خام |

## التفاصيل التقنية

### بنية PDF الخام

سيتم بناء ملف PDF يدوياً عبر:
1. كتابة ترويسة PDF (`%PDF-1.4`)
2. إنشاء كائنات PDF (Catalog, Pages, Page, Font, Content Stream)
3. استخدام خط Helvetica المدمج (يدعم ASCII فقط - لذلك النصوص بالإنجليزية)
4. بناء جدول المراجع (xref table)
5. كتابة المقطع الختامي (trailer)

### استدعاء الدالة بعد الإصلاح

بعد نشر الإصلاح، سيتم استدعاء الدالة لتوليد PDF للفواتير الـ 6 والتأكد من نجاح العملية.

