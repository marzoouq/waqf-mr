

# إصلاح مشكلة فتح الفواتير - النهج الصحيح

## تحليل السبب الجذري

الكود الحالي في `getInvoiceSignedUrl` يقوم بخطوتين:
1. إنشاء رابط موقّع عبر SDK (يعمل بشكل صحيح)
2. استدعاء `fetch(data.signedUrl)` مباشرة للنطاق المحظور (هنا تحدث المشكلة)

الخطوة الثانية تفشل لأن `fetch` يذهب مباشرة لنطاق `epopjqrwsztgxigmgurj.supabase.co` الذي حظره Chrome.

## الحل

استبدال `createSignedUrl + fetch` بـ `supabase.storage.from('invoices').download(filePath)` الذي:
- يعمل عبر SDK الداخلي (نفس الآلية التي تعمل بها باقي العمليات كالمصادقة وقراءة البيانات)
- يُرجع `Blob` مباشرة بدون الحاجة لـ fetch منفصل
- يتجاوز حظر Chrome لأنه لا يفتح النطاق مباشرة

## التغيير المطلوب

ملف واحد فقط: `src/hooks/useInvoices.ts`

تحديث دالة `getInvoiceSignedUrl` لتصبح:

```typescript
export const getInvoiceSignedUrl = async (filePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('invoices')
    .download(filePath);

  if (error || !data) throw new Error('فشل في تحميل الملف');

  return URL.createObjectURL(data);
};
```

## لماذا هذا الحل سيعمل

- عمليات قاعدة البيانات والمصادقة تعمل بشكل طبيعي عبر SDK رغم حظر النطاق
- دالة `download()` تستخدم نفس آلية SDK الداخلية
- النتيجة blob URL محلي (`blob:https://preview-domain/...`) لا علاقة له بالنطاق المحظور

## التفاصيل التقنية

- سياسة RLS على التخزين تسمح لجميع المستخدمين المصادق عليهم بعرض الفواتير (SELECT policy موجودة)
- لا حاجة لتعديل أي ملف آخر - جميع الصفحات تستدعي `getInvoiceSignedUrl` بنفس الطريقة
