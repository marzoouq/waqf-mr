<div dir="rtl">

# توثيق الوظائف الخلفية (Edge Functions)

جميع الوظائف تعمل على Lovable Cloud وتُستدعى عبر:
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.functions.invoke('اسم-الوظيفة', { body: { ... } });
```

---

## 1. `admin-manage-users` — إدارة المستخدمين

**الوصف**: وظيفة شاملة لإدارة حسابات المستخدمين. مقتصرة على الناظر (admin) فقط.

**المصادقة**: يتطلب JWT صالح + دور admin.

### العمليات المتاحة (`action`):

#### `list_users` — قائمة المستخدمين
```typescript
const { data } = await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'list_users' }
});
// الاستجابة: { users: [{ id, email, role, email_confirmed_at, created_at, last_sign_in_at }] }
```

#### `create_user` — إنشاء مستخدم
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: {
    action: 'create_user',
    email: 'user@example.com',
    password: 'كلمة_المرور',
    role: 'beneficiary', // admin | beneficiary | waqif
    name: 'اسم المستفيد', // اختياري
    nationalId: '1234567890' // اختياري - 10 أرقام
  }
});
```
> عند إنشاء مستفيد، يتم تلقائياً: إنشاء/ربط سجل المستفيد + إرسال إشعار للناظر.

#### `bulk_create_users` — إنشاء مستخدمين دفعة واحدة
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: {
    action: 'bulk_create_users',
    users: [
      { email: 'a@b.com', password: '123456', name: 'أحمد', national_id: '1234567890' },
      { email: 'c@d.com', password: '123456', name: 'محمد' }
    ]
  }
});
// الاستجابة: { success: true, created: 2, failed: 0, results: [...], errors: [...] }
```

#### `update_email` — تغيير البريد الإلكتروني
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'update_email', userId: 'uuid', email: 'new@email.com' }
});
```

#### `update_password` — تغيير كلمة المرور
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'update_password', userId: 'uuid', password: 'كلمة_جديدة' }
});
```

#### `confirm_email` — تأكيد البريد يدوياً
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'confirm_email', userId: 'uuid' }
});
```

#### `set_role` — تغيير الدور
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'set_role', userId: 'uuid', role: 'beneficiary' }
});
```

#### `delete_user` — حذف مستخدم
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'delete_user', userId: 'uuid' }
});
```
> يحذف تلقائياً: سجل المستفيد المرتبط + الدور + حساب المصادقة.

#### `toggle_registration` — تفعيل/تعطيل التسجيل
```typescript
await supabase.functions.invoke('admin-manage-users', {
  body: { action: 'toggle_registration', enabled: false }
});
```

---

## 2. `ai-assistant` — المساعد الذكي

**الوصف**: مساعد ذكي يعمل بنموذج **Google Gemini 2.5 Pro** عبر Lovable AI. أقوى نموذج في عائلة Gemini للتحليل المالي العميق.

**المصادقة**: يتطلب JWT صالح (أي مستخدم مسجل دخوله).

```typescript
const response = await supabase.functions.invoke('ai-assistant', {
  body: {
    messages: [
      { role: 'user', content: 'ما هو إجمالي الدخل هذا العام؟' }
    ],
    mode: 'chat' // أو 'analysis' أو 'report'
  }
});
```

### الأوضاع:
| الوضع | الوصف |
|-------|-------|
| `chat` | محادثة عامة عن الوقف وأحكامه |
| `analysis` | تحليل مالي مع اقتراحات |
| `report` | إعداد تقارير مالية مهيكلة |

> الاستجابة بصيغة **Server-Sent Events** (streaming).

---

## 3. `auto-expire-contracts` — انتهاء العقود تلقائياً

**الوصف**: يبحث عن العقود النشطة التي انتهى تاريخها ويغير حالتها إلى `expired`.

**المصادقة**: يقبل service_role key (للجدولة) أو JWT admin.

```typescript
// استدعاء يدوي من الناظر
const { data } = await supabase.functions.invoke('auto-expire-contracts', {
  body: {}
});
// الاستجابة: { success: true, expired_count: 3, contracts: [...] }
```

> يرسل إشعاراً للناظر عند انتهاء عقود.

---

## 4. `check-contract-expiry` — تنبيهات انتهاء العقود

**الوصف**: يبحث عن العقود التي ستنتهي خلال 30 يوماً ويرسل إشعارات تحذيرية.

**المصادقة**: يتطلب service_role key (للجدولة) أو JWT admin.

```typescript
const { data } = await supabase.functions.invoke('check-contract-expiry', {
  body: {}
});
// الاستجابة: { sent: 5, contracts: 3 }
```

> يتجنب إرسال إشعارات مكررة في نفس اليوم.

---

## 5. `lookup-national-id` — البحث بالهوية الوطنية

**الوصف**: يبحث عن البريد الإلكتروني المرتبط برقم هوية وطنية. مستخدم في صفحة تسجيل الدخول.

**المصادقة**: لا يتطلب مصادقة (عام).

**حماية**: Rate limiting — 3 طلبات في الدقيقة لكل IP.

```typescript
const { data } = await supabase.functions.invoke('lookup-national-id', {
  body: { national_id: '1234567890' }
});
// نجاح: { email: 'user@example.com' }
// فشل: { error: 'رقم الهوية غير مسجل في النظام' }
```

---

## التحقق من المدخلات

جميع الوظائف تتحقق من:
- **البريد الإلكتروني**: صيغة صالحة، أقل من 255 حرف
- **كلمة المرور**: بين 6 و 128 حرف
- **UUID**: صيغة UUID v4 صحيحة
- **الدور**: أحد القيم: `admin`, `beneficiary`, `waqif`
- **رقم الهوية**: 10 أرقام بالضبط

---

## رموز الاستجابة

| الرمز | المعنى |
|-------|--------|
| `200` | نجاح |
| `400` | خطأ في المدخلات |
| `401` | غير مصادق |
| `402` | رصيد غير كافٍ (AI) |
| `403` | ممنوع (ليس admin) |
| `404` | غير موجود |
| `405` | طريقة غير مسموحة |
| `429` | تجاوز حد الطلبات |
| `500` | خطأ داخلي |

</div>
