## المشكلة (فحص جنائي)

- **الجدول `public.invoices`**: سياسة SELECT تشمل بالفعل `beneficiary` و`waqif` (مع `is_fiscal_year_accessible`)، لذا صفوف الفواتير تظهر في UI.
- **الـ Storage bucket `invoices`**: السياسة الحالية `Admin and accountant can view invoices` هي الوحيدة لـ SELECT، فتحجب `createSignedUrl` عن المستفيد/الواقف → يظهر خطأ `فشل في تحميل الملف` عند الضغط على زر الفاتورة.
- الأزرار والمرفقات تعرض العدد الصحيح، لكن التحميل/المعاينة معطّل للمستفيد.

## الإصلاح

Migration جديد يضيف سياسة SELECT على `storage.objects` تسمح لـ `beneficiary` و`waqif` بتوليد Signed URL لملف داخل bucket `invoices` **فقط إذا** كان الملف مرتبطاً بصف فاتورة تسمح لهم سياسة الجدول برؤيته (سنة منشورة + دور مصرّح).

```sql
CREATE POLICY "Beneficiaries and waqif can view invoice files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.file_path = storage.objects.name
      AND is_fiscal_year_accessible(i.fiscal_year_id)
  )
);
```

- تعتمد على `is_fiscal_year_accessible` فتحترم قواعد إخفاء السنوات غير المنشورة.
- لا تلمس سياسة الأدمن/المحاسب.
- Signed URL يبقى بـ TTL 5 دقائق كما في `getInvoiceSignedUrl`.

## التحقق

1. `bun run tsgo --noEmit` — لا تغييرات على TS.
2. Playwright: تسجيل دخول كمستفيد → `/beneficiary/expenses` → توسيع مصروف له فاتورة → الضغط على الزر → التحقق من فتح `InvoiceViewer` وظهور محتوى PDF/صورة وعمل زر "تحميل".
3. لقطة نهائية للتأكيد.

## خارج النطاق

- لا تغيير على UI أو الهوكات (مربوطة سلفاً).
- لا تعديل على سياسات bucket أخرى.
