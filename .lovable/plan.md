

# خطة إصلاح المشاكل الأربع المؤكدة

---

## المشاكل المؤكدة بالكود الحالي

| # | المشكلة | الخطورة |
|---|---------|---------|
| 1 | `waqif` يُوجَّه إلى `/dashboard` المحظور عليه -- يرى `/unauthorized` دائما | عالية |
| 2 | `bulk_create_users` يطلب 8 أحرف بينما بقية النظام يطلب 6 | متوسطة |
| 3 | `BulkNotificationsTab` يعرض أنواع `payment` و `message` غير صالحة + يكتب مباشرة بدون RPC | متوسطة |
| 4 | `list_users` محدود بـ 100 بدون pagination | منخفضة |

---

## التغييرات المطلوبة

### 1. `src/pages/Auth.tsx` (سطر 68)

فصل `waqif` عن `admin/accountant` وتوجيهه إلى `/beneficiary`:

```text
// قبل:
} else if (role === 'admin' || role === 'waqif' || role === 'accountant') {
  navigate('/dashboard');

// بعد:
} else if (role === 'admin' || role === 'accountant') {
  navigate('/dashboard');
} else if (role === 'waqif') {
  navigate('/beneficiary');
}
```

### 2. `supabase/functions/admin-manage-users/index.ts` (سطر 279)

توحيد الحد الأدنى لكلمة المرور من 8 إلى 6:

```text
// قبل:
u.password.length < 8

// بعد:
u.password.length < 6
```

وتحديث رسالة الخطأ من `"Password must be 8-128 characters"` إلى `"كلمة المرور يجب أن تكون بين 6 و128 حرفاً"`.

### 3. `src/components/settings/BulkNotificationsTab.tsx`

**تغييران:**

**أ) الأنواع في Select (سطر 117-121):** استبدال `payment` و `message` بأنواع صالحة:

```text
// قبل:
<SelectItem value="info">... معلومات</SelectItem>
<SelectItem value="payment">... مالي</SelectItem>
<SelectItem value="warning">... تحذير</SelectItem>
<SelectItem value="message">... رسالة</SelectItem>

// بعد:
<SelectItem value="info">... معلومات</SelectItem>
<SelectItem value="success">... نجاح</SelectItem>
<SelectItem value="warning">... تحذير</SelectItem>
<SelectItem value="error">... تنبيه</SelectItem>
```

**ب) الإرسال المحدد (سطر 77):** استبدال `insert` المباشر بـ `notifyUser` من `@/utils/notifications` لضمان الاتساق المعماري:

```text
// قبل:
const { error } = await supabase.from('notifications').insert(notifications);

// بعد:
for (const b of selectedBeneficiaries) {
  notifyUser(b.user_id!, title.trim(), message.trim(), type, link.trim() || undefined);
}
```

### 4. `supabase/functions/admin-manage-users/index.ts` (سطر 111)

زيادة `perPage` من 100 إلى 500:

```text
// قبل:
const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 100 });

// بعد:
const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
```

---

## الملفات المتأثرة

1. `src/pages/Auth.tsx` -- توجيه waqif إلى `/beneficiary`
2. `supabase/functions/admin-manage-users/index.ts` -- توحيد كلمة المرور + زيادة perPage
3. `src/components/settings/BulkNotificationsTab.tsx` -- أنواع صالحة + notifyUser بدل insert

