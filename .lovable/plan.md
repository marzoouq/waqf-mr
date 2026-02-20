

# خطة إضافة تسجيل تدقيق لمحاولات الوصول غير المصرح بها

## الهدف
تتبع وتسجيل جميع محاولات الوصول غير المصرح بها في النظام، بما في ذلك: محاولات تسجيل الدخول الفاشلة، ومحاولات الوصول لصفحات بدون صلاحيات كافية، لتمكين الناظر من مراقبة أي نشاط مشبوه أو محاولات اختراق.

---

## البنود المطلوبة

### 1. جدول جديد في قاعدة البيانات: `access_log`

سيتم إنشاء جدول مخصص لتسجيل محاولات الوصول (منفصل عن `audit_log` الخاص بالعمليات على البيانات):

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid | المعرف |
| event_type | text | نوع الحدث: `login_failed`, `login_success`, `unauthorized_access`, `idle_logout` |
| email | text | البريد المستخدم (إن وُجد) |
| user_id | uuid | معرف المستخدم (إن كان مسجلاً) |
| ip_info | text | معلومات إضافية (المتصفح / user-agent) |
| target_path | text | المسار المستهدف (للوصول غير المصرح) |
| metadata | jsonb | بيانات إضافية (سبب الفشل، الدور المطلوب، إلخ) |
| created_at | timestamptz | وقت الحدث |

**سياسات الأمان (RLS):**
- SELECT: للأدمن فقط
- INSERT: مسموح لجميع المستخدمين المسجلين (لتسجيل أحداثهم)
- INSERT: مسموح للمستخدمين غير المسجلين (anon) لتسجيل محاولات الدخول الفاشلة
- UPDATE/DELETE: ممنوع تماماً

---

### 2. تعديل صفحة تسجيل الدخول (`Auth.tsx`)

- عند فشل تسجيل الدخول: تسجيل حدث `login_failed` مع البريد الإلكتروني ورسالة الخطأ
- عند نجاح تسجيل الدخول: تسجيل حدث `login_success`
- عند تسجيل الخروج بسبب الخمول: تسجيل حدث `idle_logout`

---

### 3. تعديل مكون ProtectedRoute

- عند رفض الوصول (دور غير مصرح): تسجيل حدث `unauthorized_access` مع المسار المستهدف والدور الحالي والأدوار المطلوبة

---

### 4. إنشاء hook مساعد: `useAccessLog`

دالة مساعدة لتسجيل الأحداث في جدول `access_log` بشكل موحد من أي مكان في التطبيق.

---

### 5. تبويب جديد في صفحة سجل المراجعة

إضافة تبويب "محاولات الوصول" في صفحة `AuditLogPage` يعرض:
- جدول بجميع الأحداث مع تلوين حسب النوع (أحمر للفاشل، أخضر للناجح، برتقالي لغير المصرح)
- بطاقات إحصائية: إجمالي المحاولات الفاشلة اليوم، عدد الحسابات المحظورة المحتملة
- فلترة حسب نوع الحدث والتاريخ
- عرض تفاصيل كل محاولة (المتصفح، المسار، البيانات الإضافية)

---

## التفاصيل التقنية

### Migration SQL:
```sql
CREATE TABLE public.access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  email text,
  user_id uuid,
  ip_info text,
  target_path text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

-- الأدمن فقط يمكنه القراءة
CREATE POLICY "Admins can view access_log"
  ON public.access_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- السماح بالإدراج من المستخدمين المسجلين وغير المسجلين
CREATE POLICY "Anyone can insert access_log"
  ON public.access_log FOR INSERT
  WITH CHECK (true);

-- منع التعديل والحذف
CREATE POLICY "No updates on access_log"
  ON public.access_log FOR UPDATE USING (false);

CREATE POLICY "No deletes on access_log"
  ON public.access_log FOR DELETE USING (false);
```

### useAccessLog hook:
```typescript
// src/hooks/useAccessLog.ts
export const logAccessEvent = async (event: {
  event_type: string;
  email?: string;
  user_id?: string;
  target_path?: string;
  metadata?: Record<string, unknown>;
}) => {
  await supabase.from('access_log').insert({
    ...event,
    ip_info: navigator.userAgent,
  });
};
```

### تعديلات Auth.tsx:
- بعد `signIn` الفاشل: استدعاء `logAccessEvent({ event_type: 'login_failed', email })`
- بعد `signIn` الناجح: استدعاء `logAccessEvent({ event_type: 'login_success', email, user_id })`

### تعديلات ProtectedRoute.tsx:
- عند التوجيه لصفحة `/unauthorized`: استدعاء `logAccessEvent({ event_type: 'unauthorized_access', target_path, user_id, metadata: { role, allowedRoles } })`

### تعديلات AuditLogPage.tsx:
- إضافة تبويبين: "سجل العمليات" (الحالي) و"محاولات الوصول" (الجديد)
- التبويب الجديد يعرض بيانات `access_log` مع فلاتر وإحصائيات

