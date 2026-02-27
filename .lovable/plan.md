

# خطة إصلاح مشكلتي تحديث الدور ودخول المستفيد بالهوية

## المشكلة الأولى: خطأ عند تحديث دور المستفيد

### التشخيص
في وظيفة `admin-manage-users` (سطر 177-178)، عملية `set_role` تستخدم:
```text
upsert({ user_id: userId, role: body.role }, { onConflict: 'user_id' })
```

لكن القيد الفريد (UNIQUE constraint) في جدول `user_roles` هو على **(user_id, role)** وليس على **user_id** وحده. لا يوجد فهرس فريد على `user_id` منفرداً، مما يتسبب في فشل عملية `upsert` لأن Postgres لا يجد constraint يطابق `onConflict: 'user_id'`.

### الحل
تغيير منطق `set_role` من `upsert` إلى عمليتين متتابعتين:
1. حذف الدور القديم للمستخدم
2. إدخال الدور الجديد

هذا أكثر أماناً ويعمل مع القيد الحالي `(user_id, role)`.

### الملف المتأثر
- `supabase/functions/admin-manage-users/index.ts` (سطر 177-178)

تغيير الكود من:
```text
const { error } = await adminClient.from("user_roles")
  .upsert({ user_id: userId, role: body.role }, { onConflict: 'user_id' });
```

إلى:
```text
await adminClient.from("user_roles").delete().eq("user_id", userId);
const { error } = await adminClient.from("user_roles").insert({
  user_id: userId,
  role: body.role,
});
```

---

## المشكلة الثانية: دخول المستفيد برقم الهوية

### التشخيص
فحص قاعدة البيانات أظهر:
- جميع المستفيدين الـ 14 مربوطون بحسابات مستخدمين (`user_id` موجود)
- جميعهم لديهم بريد إلكتروني
- أرقام الهوية مشفرة بنجاح (AES-256)
- مفتاح التشفير (`pii_encryption_key`) موجود ومضبوط
- دالة `lookup_by_national_id` تقوم بفك التشفير والمقارنة بشكل صحيح

**التشخيص المتوقع:** المشكلة مرتبطة بأن الدور لم يُعيّن بشكل صحيح (بسبب المشكلة الأولى)، مما يمنع المستفيد من الدخول حتى بعد التعرف على بريده بنجاح. إصلاح المشكلة الأولى يجب أن يحل هذه المشكلة أيضاً.

### اختبار إضافي بعد الإصلاح
- استدعاء وظيفة `lookup-national-id` بهوية أحد المستفيدين للتأكد من أن البحث يعمل
- التحقق من أن الدور يُجلب بنجاح بعد تسجيل الدخول

---

## ملخص التغييرات

| الملف | التعديل |
|---|---|
| `supabase/functions/admin-manage-users/index.ts` | تغيير `set_role` من upsert إلى delete + insert |

تعديل واحد فقط في ملف واحد، ثم إعادة نشر الوظيفة واختبارها.

