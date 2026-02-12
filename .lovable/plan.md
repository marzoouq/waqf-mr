

# إضافة إشعار تلقائي للناظر عند تسجيل مستفيد جديد

## الهدف
إرسال إشعار فوري للناظر (Admin) عند إضافة مستفيد جديد في النظام، سواء تمت الإضافة من واجهة إدارة المستفيدين أو من إنشاء الحسابات بالجملة.

## نقاط الإضافة (مصادر إنشاء المستفيدين)

هناك مصدران لإنشاء المستفيدين:
1. **واجهة إدارة المستفيدين** - عبر `useCreateBeneficiary` في `src/hooks/useBeneficiaries.ts`
2. **إنشاء المستخدمين بالجملة** - عبر Edge Function `admin-manage-users` (actions: `create_user`, `bulk_create_users`)

## التنفيذ

### 1. إنشاء دالة قاعدة بيانات لإشعار الناظر
دالة PostgreSQL جديدة `notify_admins(title, message, type, link)` تقوم بـ:
- جلب جميع المستخدمين الذين لديهم دور `admin` من جدول `user_roles`
- إدراج إشعار لكل ناظر في جدول `notifications`

### 2. تحديث `useBeneficiaries.ts`
في `useCreateBeneficiary` - `onSuccess`:
- استدعاء دالة `notify_admins` عبر RPC
- إرسال إشعار بعنوان "مستفيد جديد" مع اسم المستفيد

### 3. تحديث Edge Function `admin-manage-users`
في actions `create_user` و `bulk_create_users`:
- بعد إنشاء المستفيد بنجاح، إدراج إشعار مباشرة في جدول `notifications` لجميع المسؤولين

## القسم التقني

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, p_title, p_message, p_type, p_link
  FROM public.user_roles
  WHERE role = 'admin';
END;
$$;
```

### تعديل `src/hooks/useBeneficiaries.ts`
في `onSuccess` لـ `useCreateBeneficiary`:
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
  toast.success('تم إضافة المستفيد بنجاح');
  supabase.rpc('notify_admins', {
    p_title: 'مستفيد جديد',
    p_message: `تم تسجيل مستفيد جديد: ${data.name}`,
    p_type: 'info',
    p_link: '/dashboard/beneficiaries',
  }).then();
},
```

### تعديل `supabase/functions/admin-manage-users/index.ts`
بعد إنشاء مستفيد في `create_user` و `bulk_create_users`:
```typescript
await adminClient.rpc('notify_admins', {
  p_title: 'مستفيد جديد',
  p_message: `تم تسجيل مستفيد جديد: ${name}`,
  p_type: 'info',
  p_link: '/dashboard/beneficiaries',
});
```

### الملفات المتأثرة
| الملف | التعديل |
|-------|---------|
| Migration جديد | إنشاء دالة `notify_admins` |
| `src/hooks/useBeneficiaries.ts` | إضافة إشعار بعد إنشاء مستفيد |
| `supabase/functions/admin-manage-users/index.ts` | إضافة إشعار بعد إنشاء مستفيد بالجملة |

