

# خطة إصلاح 4 مشاكل مؤكدة

---

## المشاكل والإصلاحات

### 1. (حرج) `login_success` يسجّل رقم الهوية عبر البريد في `access_log`

**الملف:** `src/pages/Auth.tsx` (سطر 151-155)

تم إصلاح `login_failed` سابقا (سطر 145: `email: loginMethod === 'national_id' ? null : resolvedEmail`) لكن `login_success` لم يُصلح.

**الإصلاح:** تطبيق نفس الحماية على `login_success`:
```text
// قبل
email: resolvedEmail,

// بعد
email: loginMethod === 'national_id' ? null : resolvedEmail,
```

### 2. (حرج) `create_user` يُرجع كائن `user` كاملا

**الملف:** `supabase/functions/admin-manage-users/index.ts` (سطر 281)

**الإصلاح:** إرجاع `id` و `email` فقط:
```text
// قبل
return new Response(JSON.stringify({ success: true, user: newUser.user }), ...);

// بعد
return new Response(JSON.stringify({ 
  success: true, 
  user: { id: newUser.user.id, email: newUser.user.email } 
}), ...);
```

### 3. (حرج) `bulk_create_users` يُعلن نجاحا كاذبا عند فشل `user_roles` أو `beneficiaries`

**الملف:** `supabase/functions/admin-manage-users/index.ts` (سطر 324-344)

**الإصلاح:** إضافة فحص أخطاء لكل عملية insert، وعند فشل أي منها تسجيل الخطأ وحذف المستخدم المُنشأ (rollback):
```text
const { error: roleError } = await adminClient.from("user_roles").insert({...});
if (roleError) {
  await adminClient.auth.admin.deleteUser(newUser.user.id);
  errors.push({ email: u.email, error: "فشل تعيين الدور: " + roleError.message });
  continue;
}

const { error: benError } = await adminClient.from("beneficiaries").insert({...});
if (benError) {
  await adminClient.from("user_roles").delete().eq("user_id", newUser.user.id);
  await adminClient.auth.admin.deleteUser(newUser.user.id);
  errors.push({ email: u.email, error: "فشل إنشاء المستفيد: " + benError.message });
  continue;
}

// الإشعار اختياري — لا يُسبب فشلا
await adminClient.rpc('notify_admins', {...}).catch(() => {});

results.push({ email: u.email, userId: newUser.user.id, success: true });
```

### 4. (متوسط) `set_role` يستخدم DELETE+INSERT غير atomic

**الملف:** `supabase/functions/admin-manage-users/index.ts` (سطر 163-168)

**الإصلاح:** استخدام `upsert` بدلا من DELETE+INSERT:
```text
// قبل
await adminClient.from("user_roles").delete().eq("user_id", userId);
const { error } = await adminClient.from("user_roles").insert({
  user_id: userId,
  role: body.role,
});

// بعد
const { error } = await adminClient.from("user_roles")
  .upsert({ user_id: userId, role: body.role }, { onConflict: 'user_id' });
```

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/Auth.tsx` | سطر 153: حماية البريد عند login_success |
| `supabase/functions/admin-manage-users/index.ts` | سطر 163-168: upsert بدل DELETE+INSERT |
| `supabase/functions/admin-manage-users/index.ts` | سطر 281: تصفية user object |
| `supabase/functions/admin-manage-users/index.ts` | سطر 324-344: فحص أخطاء + rollback |

