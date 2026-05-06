
# خطة إصلاح الخطأين الأمنيين الحرجين قبل النشر

## ملاحظة مهمة بعد التحقق الفعلي من السياسات الحالية

عند فحص قاعدة البيانات مباشرة وجدت الواقع مختلف قليلاً عمّا أظهره الـ scanner:

### 1) ملفات الفواتير (`storage.objects` / bucket `invoices`)
السياسة الفعلية القائمة اسمها **`Role-based users can view invoices`** وتسمح للأدوار الأربعة (`admin`, `accountant`, `beneficiary`, `waqif`) بقراءة **كل** الملفات في الـ bucket بدون أي تقييد بالملكية.

⚠️ هذا يكشف ملفات PDF + XML الخاصة بـ ZATCA (تحوي PII، أرقام ضريبية، بيانات مستأجرين) لجميع المستفيدين والواقفين — وهذا هو الخطر الفعلي.

### 2) `realtime.messages`
يوجد بالفعل سياسة واحدة **`Authorized realtime subscriptions`** تقصر الاشتراك على `admin` و `accountant` فقط. لكن:
- لا يوجد RLS مفصّل يمنع باقي المستخدمين بشكل صريح
- المستفيد/الواقف الآن **لا يستطيع** استقبال إشعاراته اللحظية الخاصة (مشكلة وظيفية)
- الـ scanner ما زال يُصنّفها كثغرة لأن السياسة الوحيدة لا تُقيّد قنوات الإدمن بشكل واضح

## الإصلاحان المقترحان

### الإصلاح 1 — تقييد قراءة ملفات الفواتير

استبدال `Role-based users can view invoices` بسياسة تقصر القراءة المباشرة على `admin` و `accountant` فقط.

المستفيد/الواقف لا يحتاجون وصولاً مباشراً للـ bucket — تطبيقهم يقرأ بيانات الفاتورة من جدول `payment_invoices` (محمي بـ RLS صحيح)، وأي تنزيل PDF يجب أن يمرّ عبر Edge Function `generate-invoice-pdf` التي تتحقق من الصلاحية والملكية.

```sql
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;

CREATE POLICY "Admin and accountant can view invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role))
);
```

### الإصلاح 2 — ضبط سياسات `realtime.messages` بدقة

استبدال السياسة العامّة الوحيدة بسياستين مفصّلتين:

```sql
DROP POLICY IF EXISTS "Authorized realtime subscriptions" ON realtime.messages;

-- (أ) admin/accountant يصلون لكل القنوات
CREATE POLICY "Admins and accountants full realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- (ب) باقي المستخدمين فقط للقنوات المرتبطة بـ user_id الخاص بهم
-- (notifications, conversations, support tickets…)
CREATE POLICY "Users can subscribe to own scoped topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  OR realtime.topic() = 'notifications:' || auth.uid()::text
);
```

> سيُنشأ كل ذلك في **migration واحدة** عبر `supabase--migration`.

## بعد التنفيذ

1. تحديث الـ frontend (إن لزم) لاستخدام أسماء topics بصيغة `notifications:<uid>` أو `user:<uid>:*` — سأفحص الكود الحالي ثم أُجري التعديلات الضرورية فقط.
2. إعادة تشغيل `security--run_security_scan` للتأكد من اختفاء الخطأين الـ ERROR.
3. التحقق يدوياً: تسجيل دخول كمستفيد → محاولة فتح ملف فاتورة بالمسار المباشر يجب أن تفشل (403) → الإشعارات اللحظية تصل طبيعياً.

## ما هو خارج نطاق هذه الخطة

- 72 تحذير `SECURITY DEFINER` (مقصودة للـ has_role pattern) — لا تُغيَّر.
- bucket `waqf-assets` العام (مقصود — ذاكرة `waqf-assets-public-bucket-rationale`).
- صفحة الهبوط البحرية / دور designer (مُلغاة سابقاً).

## النتيجة المتوقعة

بعد التنفيذ: **0 ERROR** في security scan، وجاهزية كاملة للنشر.
