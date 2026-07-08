## الخطة النهائية — مواءمة مع التصميم الأصلي للتطبيق

التصميم الأصلي للنظام ينصّ على أن ملفات فواتير الوقف (تحوي PII للمستأجرين: أرقام هوية، أرقام ضريبية، تفاصيل مالية) تُقرأ حصراً بواسطة الناظر والمحاسب. المستفيد والواقف يصلون للبيانات عبر الواجهات المجمّعة (تقارير، ملخصات، حصص) وليس عبر تنزيل PDF خام. هذا يطابق توصية الفحص الأمني.

### 1) إصلاح سياسات bucket `invoices`
- حذف `Authenticated users can view invoices` (تسمح لأي مستخدم مسجّل).
- حذف `Role-based users can view invoices` (تشمل beneficiary و waqif بشكل غير آمن).
- الإبقاء على السياسات المقيّدة القائمة:
  - `Admins can read invoices`
  - `Accountants can read invoices`
  - `Admin and accountant can view invoices`

### 2) التحقق بعد التنفيذ
- استعلام `pg_policies` للتأكد أن سياسات SELECT على `storage.objects` لـ bucket `invoices` أصبحت مقتصرة على admin/accountant فقط.
- تصفّح واجهة المستفيد للتأكد أن التقارير والملخصات لا تعتمد على تنزيل مباشر من bucket الفواتير (تعتمد على جداول مثل `distributions` و`disbursement_vouchers`).

### 3) تحديث حالة الفحص الأمني
- وضع finding واحد فقط كـ fixed:
  - `scanner_name`: `supabase_lov`
  - `internal_id`: `invoices_bucket_overbroad_access`
- لن يُصلح أو يُتجاهل أي finding آخر.

### 4) تحديث security memory
- توثيق أن bucket `invoices` مخصّص لأدوار admin/accountant فقط، وأن أي سياسة قراءة مستقبلية تشمل beneficiary أو waqif مرفوضة لأنها تكشف PII للمستأجرين.

### تفاصيل تقنية
- migration واحدة تحتوي فقط على أمرين:
  ```sql
  DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
  DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
  ```
- لا تغييرات على كود الواجهة الأمامية (المستفيد/الواقف لا يستخدمان تنزيل PDF مباشر من هذا bucket في التصميم الحالي).