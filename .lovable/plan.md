

# خطة إصلاح مشكلتي تحديث الدور ودخول المستفيد بالهوية — ✅ مكتمل

## المشكلة الأولى: خطأ عند تحديث دور المستفيد ✅

### التشخيص
عملية `set_role` كانت تستخدم `upsert` مع `onConflict: 'user_id'` لكن القيد الفريد على `(user_id, role)`.

### الإصلاح
تم تغيير المنطق إلى delete + insert في `supabase/functions/admin-manage-users/index.ts`.

---

## المشكلة الثانية: دخول المستفيد برقم الهوية ✅

### التشخيص
تم اكتشاف **مشكلتين** في دالة `lookup_by_national_id`:

1. **خطأ نطاق المتغير**: `decrypted_id` كان معرّفاً داخل بلوك `DECLARE` فرعي ويُستخدم خارجه — تم نقله للبلوك الرئيسي.

2. **search_path ناقص**: الدالة كانت تستخدم `SET search_path TO 'public'` فقط، بينما `pgcrypto` مثبت في schema `extensions`. فكان فك التشفير يفشل دائماً، والـ `EXCEPTION WHEN OTHERS` يعيد القيمة المشفرة التي لا تطابق أي رقم هوية.

### الإصلاح
- نقل `decrypted_id` إلى `DECLARE` الرئيسي
- إضافة `extensions` إلى `search_path`

---

## ملخص التغييرات المنفذة

| الملف/العنصر | التعديل |
|---|---|
| `supabase/functions/admin-manage-users/index.ts` | تغيير `set_role` من upsert إلى delete + insert |
| دالة `lookup_by_national_id` (migration) | إصلاح نطاق المتغير + إضافة `extensions` لـ search_path |

## التحقق
- ✅ وظيفة `lookup-national-id` تعيد `found: true` مع البريد الصحيح
- ✅ وظيفة `admin-manage-users` تم نشرها بنجاح
