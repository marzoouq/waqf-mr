<div dir="rtl">

# توثيق الوظائف الخلفية (Edge Functions) — 9 وظائف

جميع الوظائف تعمل على Lovable Cloud وتُستدعى عبر:
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.functions.invoke('اسم-الوظيفة', { body: { ... } });
```

---

## 1. `admin-manage-users` — إدارة المستخدمين

**الوصف**: وظيفة شاملة لإدارة حسابات المستخدمين. مقتصرة على الناظر (admin) فقط. جميع الأسماء المُدخلة تُعقّم (`safeName`) لمنع حقن محتوى ضار في الإشعارات.

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

**الوصف**: مساعد ذكي يعمل بنماذج **Google Gemini 2.5 Pro** (للتحليل) و **Gemini 2.5 Flash** (للمحادثة) عبر Lovable AI.

**المصادقة**: يتطلب JWT صالح (أي مستخدم مسجل دخوله). يُرجع 403 إذا تعذّر تحديد دور المستخدم.

**فلترة البيانات حسب الدور**:
| الدور | البيانات المتاحة |
|-------|-----------------|
| الناظر / المحاسب | بيانات كاملة: عقود، حسابات تفصيلية، أسماء مستأجرين، مستفيدين |
| المستفيد / الواقف | ملخص عام فقط: إجمالي دخل/مصروفات، عدد العقود النشطة (بدون تفاصيل)، بياناته الشخصية فقط |

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
| `analysis` | تحليل مالي مع اقتراحات (يستخدم gemini-2.5-pro) |
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

**الوصف**: يبحث عن العقود التي ستنتهي خلال 30 يوماً ويرسل إشعارات تحذيرية للناظر والمستفيدين.

**المصادقة**: مصادقة مزدوجة — يقبل أحد الخيارين:
1. **service_role key**: للمهام المجدولة (Cron Jobs) — يُقارن التوكن مباشرة بمتغير البيئة `SUPABASE_SERVICE_ROLE_KEY`
2. **JWT admin**: للاستدعاء اليدوي — يتحقق عبر `getClaims()` ثم يفحص دور `admin` في جدول `user_roles`

> ⚠️ ملاحظة: `verify_jwt = false` في `config.toml` — قرار واعٍ لتسهيل استدعاء Cron مع التحقق اليدوي في الكود.

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

## 6. `guard-signup` — حماية التسجيل

**الوصف**: يتحقق من إعداد `registration_enabled` قبل السماح بإنشاء حساب جديد. يُستخدم بدلاً من التسجيل المباشر عبر نظام المصادقة.

**المصادقة**: لا يتطلب مصادقة (عام — مطلوب قبل إنشاء الحساب).

```typescript
const { data } = await supabase.functions.invoke('guard-signup', {
  body: { email: 'user@example.com', password: 'كلمة_المرور' }
});
// نجاح: { user: { id, email, ... } }
// فشل: { error: 'التسجيل معطل حالياً' }
```

> يتحقق من: صيغة البريد، طول كلمة المرور (6-128)، وإعداد `registration_enabled` في `app_settings`.

---

## 7. `generate-invoice-pdf` — توليد فاتورة PDF

**الوصف**: يولّد ملف PDF لفاتورة محددة بناءً على بياناتها المخزنة. لا يكشف معرفات الفواتير غير الصالحة في الاستجابة.

**المصادقة**: يتطلب JWT صالح.

```typescript
const { data } = await supabase.functions.invoke('generate-invoice-pdf', {
  body: { invoiceId: 'uuid' }
});
// الاستجابة: ملف PDF (binary)
```

---

## 8. `webauthn` — المصادقة البيومترية

**الوصف**: وظيفة للتسجيل والتحقق عبر WebAuthn (بصمة الإصبع / Face ID). تدير التحديات (`challenges`) وبيانات الاعتماد (`credentials`).

**المصادقة**: يتطلب JWT صالح.

### العمليات المتاحة:

#### `register-options` — خيارات التسجيل
```typescript
const { data } = await supabase.functions.invoke('webauthn', {
  body: { action: 'register-options' }
});
// الاستجابة: { challenge, rp, user, pubKeyCredParams, ... }
```

#### `register-verify` — التحقق من التسجيل
```typescript
const { data } = await supabase.functions.invoke('webauthn', {
  body: { action: 'register-verify', credential: { ... }, deviceName: 'هاتفي' }
});
```

#### `authenticate-options` — خيارات المصادقة
```typescript
const { data } = await supabase.functions.invoke('webauthn', {
  body: { action: 'authenticate-options' }
});
```

#### `authenticate-verify` — التحقق من المصادقة
```typescript
const { data } = await supabase.functions.invoke('webauthn', {
  body: { action: 'authenticate-verify', credential: { ... } }
});
```

---

## 9. `auth-email-hook` — قوالب البريد المخصصة

**الوصف**: Hook يعالج أحداث البريد الإلكتروني للمصادقة (تأكيد التسجيل، استعادة كلمة المرور، رابط سحري، دعوة، تغيير البريد، إعادة المصادقة) ويُرسل رسائل بتصميم مخصص عبر React Email.

**المصادقة**: يُستدعى تلقائياً من نظام المصادقة (ليس وظيفة عامة).

**القوالب المتاحة** (في `supabase/functions/_shared/email-templates/`):
| القالب | الوصف |
|--------|-------|
| `signup.tsx` | تأكيد التسجيل |
| `recovery.tsx` | استعادة كلمة المرور |
| `magic-link.tsx` | رابط تسجيل الدخول السحري |
| `invite.tsx` | دعوة مستخدم جديد |
| `email-change.tsx` | تأكيد تغيير البريد |
| `reauthentication.tsx` | إعادة المصادقة |

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
