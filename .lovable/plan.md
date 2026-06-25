في لحظة ظهور رسالتك توقّف استدعاء `plan--create` لذلك لم تُعرض الخطة بالكامل. سأعيد تقديمها وأجيب على سؤالك.

**الإجابة المختصرة:** لا، هذا ليس كل شيء. الفحص المُحفّظ (persisted) يُظهر **مشكلة أمنية واحدة حرجة** على دلو `invoices`. لكن الفحص التفصيلي المباشر (`security--run_security_scan`) رجّع **184 ملاحظة** منها تحذيرات من Linter Supabase حول `SECURITY DEFINER` ودلوه عامة وإمكانية تنفيذ دوال للـ `anon`. ليست كلها ثغرات — بعضها قد يكون مقصوداً — لكنها تستحق مراجعة سريعة.

## المشكلة الأمنية المُكتشفة (Severity: error)

من نتائج فحص `supabase_lov`:

**العنوان:** `Invoice files accessible to all authenticated users regardless of role`

**التحليل الفعلي بعد فحص السياسات الحالية على `storage.objects` لدلو `invoices`:**

السياسة القديمة `Authenticated users can view invoices` تمت إزالتها بالفعل، لكن السياسة الحالية:

```sql
"Role-based users can view invoices"
USING bucket_id = 'invoices' AND (
  has_role(auth.uid(),'admin') OR
  has_role(auth.uid(),'accountant') OR
  has_role(auth.uid(),'beneficiary') OR
  has_role(auth.uid(),'waqif')
)
```

لا تزال **تمنح كل مستفيد وكل واقف وصولاً مباشراً لأي ملف PDF لأي فاتورة** في الدلو عبر URL التخزين (تجاوزاً لأي فلترة على مستوى التطبيق). هذا يخالف نموذج الصلاحيات المعتمد في المشروع (الفواتير الضريبية ZATCA = مستندات تشغيلية يطّلع عليها الناظر والمحاسب فقط).

## الخطة

### 1. ترحيل قاعدة بيانات (migration واحد)

استبدال السياسة `Role-based users can view invoices` بسياسة مقصورة على الناظر والمحاسب:

```sql
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;

CREATE POLICY "Admin and accountant can view invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  )
);
```

سياسات INSERT/UPDATE/DELETE الحالية (admin + accountant) تبقى كما هي — صحيحة.

### 2. فحص مسارات التطبيق التي قد تُحمّل ملف الفاتورة لمستفيد/واقف

البحث في الكود عن أي استخدام لـ `from('invoices').download` أو `getPublicUrl('invoices'...)` ضمن مسارات بيانية للمستفيد/الواقف. لو وُجد:
- إما حذف الزر/الرابط من واجهات `beneficiary/` و `waqif/`
- أو توجيه الطلب عبر Edge Function تتحقق من ملكية الفاتورة وتُعيد الملف موقَّعاً (signed URL).

(لن يُكتب كود جديد للـ Edge Function إلا إذا اكتُشف اعتماد فعلي في الواجهات؛ غير ذلك يكفي ترحيل السياسة.)

### 3. التحقق

- إعادة تشغيل `security--run_security_scan` للتأكد من اختفاء الـ finding.
- اختبار يدوي: محاولة تنزيل ملف من دلو `invoices` بحساب مستفيد → يجب أن يفشل بـ 403.
- تشغيل `supabase--linter` للتحقق من عدم استحداث أي تحذير جديد.

### تنبيه — سؤال للمستخدم قبل التنفيذ

هل واجهة المستفيد/الواقف الحالية تعرض زر «تنزيل PDF» لملفات من دلو `invoices`؟
- **(أ) لا** — نطبّق الترحيل مباشرة دون أي تغيير في الواجهة.
- **(ب) نعم، وأرغب باستمرار الإتاحة المحدودة** — نضيف Edge Function تُصدر signed URL بعد التحقق من ربط الفاتورة بالمستفيد.
- **(ج) نعم، ولكن يمكن إزالتها** — نزيل الأزرار من واجهات `beneficiary/` و `waqif/`.

أرجو اختيار أحد الخيارات لأكمل الخطة وفقاً لذلك.