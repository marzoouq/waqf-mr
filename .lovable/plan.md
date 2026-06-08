# إغلاق التحذيرات المعروفة في الفحص الأمني

## النتيجة الفعلية بعد التحقق

من `get_scan_results` يوجد **finding واحد فقط** قابل للإغلاق عبر `manage_security_finding`:

- **Scanner**: `agent_security`
- **internal_id**: `invoices_bucket_overbroad`
- **المحتوى**: يدّعي وجود سياسة `Authenticated users can view invoices` على `storage.objects` تمنح قراءة لكل مستخدم مسجّل دخول.

### التحقق المباشر من قاعدة البيانات

استعلام `pg_policy` على `storage.objects` يُظهر أن **السياسة المذكورة غير موجودة**. سياسات bucket `invoices` الموجودة فعلياً كلها مقيّدة بـ `has_role(...)`:

- `Admin and accountant can view invoice files` — SELECT مقيّد بـ admin/accountant
- `Accountants/Admins can upload/update/delete invoices` — مقيّدة بدور صريح

و bucket `invoices` خاص (`public: false`). إذن الـ finding **false positive** ولا يحتاج تعديلاً في الكود أو الـ DB.

## الإجراء

### 1. إغلاق الـ finding عبر `manage_security_finding`

استدعاء واحد:

```
operation: mark_as_fixed
scanner_name: agent_security
internal_id: invoices_bucket_overbroad
explanation: تم التحقق المباشر من pg_policy على storage.objects — السياسة المذكورة "Authenticated users can view invoices" غير موجودة. كل سياسات bucket invoices مقيّدة بـ has_role() لأدوار admin/accountant فقط، و bucket invoices خاص (public: false). الفحص يستند إلى لقطة قديمة قبل إصلاحات سابقة.
```

استخدام `mark_as_fixed` بدلاً من `ignore` لأن الإصلاح فعلي ومُطبَّق (وإن كان قبل الفحص الحالي).

### 2. تحديث `@security-memory` لتثبيت الحالة

إضافة قسم موجز يوثّق:

- **invoices bucket**: خاص، SELECT مقيّد بـ `has_role(admin)` أو `has_role(accountant)` فقط. ممنوع إضافة أي سياسة تستخدم `auth.role() = 'authenticated'` على هذا الـ bucket.
- **realtime.messages**: RLS مُفعّل بسياستين: (admin/accountant) + (subscribe to own scoped topics: `notifications:{uid}` و `user:{uid}:%`). ممنوع توسيعه.
- تأكيد أن الـ 176 finding في Supabase Linter كلها داخل النطاق المقبول الموثّق في الأقسام 1–8 (pre-auth RPCs، `waqf-assets` public، `contracts_safe` view).

## ما لن أفعله ولماذا

- **لن أُغلق الـ ~40 finding من Supabase Linter يدوياً** — `run_security_scan` لا يُرجع `internal_id` لكل صف منها، والـ `get_scan_results` يُظهر صفر لمُكتشف `supabase` (يعني: الـ linter لا يفرضها كـ findings مفتوحة قابلة للإدارة). محاولة استدعاء `manage_security_finding` لها سترفض.
- **لن أُعدّل أي ملف كود أو migration** — كل الإصلاحات الموضوعية مُطبَّقة فعلاً (تحققت منها بـ SQL مباشر).
- **لن أُلغي pre-auth RPCs أو bucket `waqf-assets` العام** — موثّقة كـ accepted risks في الأقسام 8.3 و 8.6.

## التحقق بعد التنفيذ

- إعادة `get_scan_results` للتأكد من اختفاء `invoices_bucket_overbroad` من قائمة `agent_security`.
- التأكد من أن `@security-memory` يتضمن البندين الجديدين (invoices + realtime.messages).
