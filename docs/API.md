<div dir="rtl">

# توثيق الوظائف الخلفية (Edge Functions) — 11 وظيفة

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

## 3. `check-contract-expiry` — تنبيهات انتهاء العقود

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

## 4. `lookup-national-id` — البحث بالهوية الوطنية

**الوصف**: يبحث عن البريد الإلكتروني المرتبط برقم هوية وطنية (يُرجع البريد مُقنّعاً). يدعم أيضاً تسجيل الدخول المباشر عبر تمرير كلمة المرور.

**المصادقة**: لا يتطلب مصادقة (عام).

**حماية**: Rate limiting — 5 طلبات كل 120 ثانية لكل IP + Fail-closed + Timing-safe response (300ms ثابتة).

```typescript
// بحث فقط (بدون كلمة مرور)
const { data } = await supabase.functions.invoke('lookup-national-id', {
  body: { national_id: '1234567890' }
});
// نجاح: { found: true, masked_email: 'u***@example.com', remaining: 4 }
// غير موجود: { found: false, masked_email: null, remaining: 4 }
// تجاوز الحد: { error: 'تم تجاوز حد المحاولات...', remaining: 0, retry_after: 85 }

// بحث + تسجيل دخول (مع كلمة مرور)
const { data } = await supabase.functions.invoke('lookup-national-id', {
  body: { national_id: '1234567890', password: '********' }
});
// نجاح: { found: true, masked_email: 'u***@example.com', remaining: 3, session: { access_token, refresh_token } }
// كلمة مرور خاطئة: { found: true, masked_email: 'u***@example.com', remaining: 3, auth_error: 'كلمة المرور غير صحيحة' }
```

---

## 5. `guard-signup` — حماية التسجيل

**الوصف**: يتحقق من إعداد `registration_enabled` قبل السماح بإنشاء حساب جديد. يُستخدم بدلاً من التسجيل المباشر عبر نظام المصادقة.

**المصادقة**: لا يتطلب مصادقة (عام — مطلوب قبل إنشاء الحساب).

```typescript
const { data } = await supabase.functions.invoke('guard-signup', {
  body: { email: 'user@example.com', password: 'كلمة_المرور' }
});
// نجاح: { user: { id, email, ... } }
// فشل: { error: 'التسجيل معطل حالياً' }
```

> يتحقق من: صيغة البريد، طول كلمة المرور (8-128)، وإعداد `registration_enabled` في `app_settings`.

---

## 6. `generate-invoice-pdf` — توليد فاتورة PDF

**الوصف**: يولّد ملف PDF لفاتورة محددة بناءً على بياناتها المخزنة. لا يكشف معرفات الفواتير غير الصالحة في الاستجابة.

**المصادقة**: يتطلب JWT صالح.

```typescript
const { data } = await supabase.functions.invoke('generate-invoice-pdf', {
  body: { invoiceId: 'uuid' }
});
// الاستجابة: ملف PDF (binary)
```

---

## 7. `webauthn` — المصادقة البيومترية

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

## 8. `auth-email-hook` — قوالب البريد المخصصة

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

## 9. `zatca-xml-generator` — توليد فاتورة إلكترونية (XML)

**الوصف**: يولّد مستند XML بصيغة UBL 2.1 لفاتورة محددة وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA). يدعم الفواتير القياسية والمبسطة وإشعارات المدين والدائن. يحفظ XML في جدول الفاتورة تلقائياً.

**المصادقة**: يتطلب JWT صالح + دور admin أو accountant.

```typescript
const { data } = await supabase.functions.invoke('zatca-xml-generator', {
  body: {
    invoice_id: 'uuid',
    table: 'invoices' // أو 'payment_invoices'
  }
});
// الاستجابة: { success: true, xml_length: 4523 }
```

**أنواع الفواتير المدعومة**:
| النوع | الكود | الوصف |
|-------|-------|-------|
| `standard` / `قياسية` | 388 | فاتورة قياسية |
| `simplified` / `مبسطة` | 388 | فاتورة مبسطة |
| `debit_note` / `إشعار مدين` | 383 | إشعار مدين |
| `credit_note` / `إشعار دائن` | 381 | إشعار دائن |

---

## 10. `zatca-signer` — توقيع الفاتورة الإلكترونية

**الوصف**: يوقّع فاتورة XML رقمياً وفق معيار XMLDSig باستخدام ECDSA P-256. يتضمن: تخصيص ICV ذري، حساب Hash، بناء `SignedProperties` و `SignedInfo`، توليد التوقيع الرقمي، حقن رمز QR (TLV)، وحفظ النتيجة. يمنع التوقيع المزدوج.

**المصادقة**: يتطلب JWT صالح + دور admin أو accountant.

```typescript
const { data } = await supabase.functions.invoke('zatca-signer', {
  body: {
    invoice_id: 'uuid',
    table: 'invoices' // أو 'payment_invoices'
  }
});
// الاستجابة: { success: true, icv: 42, invoice_hash: '...', qr_base64: '...' }
```

**التحقق قبل التوقيع**:
- وجود مبلغ الفاتورة ومبلغ الضريبة ومعرّف UUID
- اتساق المبالغ: `المبلغ بدون ضريبة + الضريبة = الإجمالي`
- وجود عناصر ZATCA المطلوبة في XML (ICV، UBLExtensions)
- عدم وجود توقيع سابق (منع التوقيع المزدوج)

---

## 11. `zatca-api` — التكامل مع بوابة فاتورة (ZATCA)

**الوصف**: يتواصل مع بوابة ZATCA الرسمية لتنفيذ عمليات الربط والإرسال. يدعم بيئتي الإنتاج والمحاكاة (Sandbox). يسجّل جميع العمليات في `zatca_operation_log`.

**المصادقة**: يتطلب JWT صالح + دور admin.

### العمليات المتاحة (`action`):

#### `test-connection` — اختبار الاتصال بالبوابة
```typescript
const { data } = await supabase.functions.invoke('zatca-api', {
  body: { action: 'test-connection' }
});
// الاستجابة: { connected: true, url: '...', status_code: 200, tested_at: '...' }
```

#### `onboard` — التسجيل في بوابة فاتورة (CCSID + PCSID)
```typescript
const { data } = await supabase.functions.invoke('zatca-api', {
  body: { action: 'onboard' }
});
```

#### `compliance` — فحص المطابقة
```typescript
const { data } = await supabase.functions.invoke('zatca-api', {
  body: { action: 'compliance', invoice_id: 'uuid', table: 'invoices' }
});
```

#### `report` — إرسال فاتورة (Reporting)
```typescript
const { data } = await supabase.functions.invoke('zatca-api', {
  body: { action: 'report', invoice_id: 'uuid', table: 'invoices' }
});
```

#### `clearance` — اعتماد فاتورة (Clearance)
```typescript
const { data } = await supabase.functions.invoke('zatca-api', {
  body: { action: 'clearance', invoice_id: 'uuid', table: 'invoices' }
});
```

> يحدد URL البوابة تلقائياً من إعداد `zatca_platform` في `app_settings` (إنتاج/محاكاة).

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
| `409` | تعارض (مثل توقيع مزدوج) |
| `422` | فشل التحقق قبل المعالجة |
| `429` | تجاوز حد الطلبات |
| `500` | خطأ داخلي |

</div>
