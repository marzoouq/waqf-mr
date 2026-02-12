

# إضافة إشعارات تلقائية للمستفيدين

## الهدف
إرسال إشعارات فورية لجميع المستفيدين المرتبطين بحسابات مستخدمين عند:
1. حفظ/تحديث الحسابات الختامية (الإفصاح السنوي)
2. تحديث التوزيعات المالية

## البنية الحالية
- جدول `notifications` موجود مع RLS مناسبة
- `useNotifications` hook مع Realtime subscription يعمل
- `NotificationBell` يعرض الإشعارات فوراً
- جدول `beneficiaries` يحتوي على عمود `user_id` لربط المستفيد بحسابه

## التنفيذ

### 1. إنشاء Database Function لإرسال إشعارات جماعية
دالة PostgreSQL `notify_all_beneficiaries(title, message, type, link)` تقوم بـ:
- جلب جميع المستفيدين الذين لديهم `user_id` مرتبط
- إدراج إشعار لكل مستفيد في جدول `notifications`
- هذا يضمن وصول الإشعار حتى لو كان المستفيد غير متصل (يراه عند تسجيل الدخول)

### 2. تحديث صفحة الحسابات الختامية (`AccountsPage.tsx`)
بعد نجاح حفظ الحساب (`handleCreateAccount`):
- استدعاء دالة `notify_all_beneficiaries` عبر Supabase RPC
- إرسال إشعار بعنوان "تحديث الحسابات الختامية" مع رابط لصفحة الحسابات
- إرسال إشعار منفصل عند تحديث التوزيعات بعنوان "تحديث التوزيعات المالية"

### 3. أنواع الإشعارات الجديدة
| النوع | العنوان | الرسالة | الرابط |
|-------|---------|---------|--------|
| `payment` | تحديث الحسابات الختامية | تم تحديث الحسابات الختامية للسنة المالية {year} | `/beneficiary/accounts` |
| `payment` | تحديث التوزيعات | تم تحديث توزيعات الأرباح للسنة المالية {year}. يرجى مراجعة حصتك | `/beneficiary/my-share` |

## القسم التقني

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION notify_all_beneficiaries(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT user_id, p_title, p_message, p_type, p_link
  FROM beneficiaries
  WHERE user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### تعديل `AccountsPage.tsx`
- بعد `createAccount.mutateAsync(...)` الناجح، استدعاء:
```typescript
await supabase.rpc('notify_all_beneficiaries', {
  p_title: 'تحديث الحسابات الختامية',
  p_message: `تم تحديث الحسابات الختامية للسنة المالية ${fiscalYear}`,
  p_type: 'payment',
  p_link: '/beneficiary/accounts'
});
```

### الملفات المتأثرة
| الملف | التعديل |
|-------|---------|
| Migration جديد | إنشاء دالة `notify_all_beneficiaries` |
| `AccountsPage.tsx` | إضافة استدعاء الإشعارات بعد الحفظ |

