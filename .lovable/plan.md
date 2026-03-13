

# تقرير الفحص الجنائي الشامل — التحقق من SECURITY-KNOWLEDGE.md

## الملخص التنفيذي

تم فحص **كل بند** في وثيقة الإرشادات الأمنية مقابل الكود الفعلي. النتيجة: **التطبيق مطابق بنسبة ~95%** مع وجود **فجوة توثيقية واحدة مؤكدة** تحتاج إصلاح.

---

## ✅ البنود المؤكدة (مطبّقة بالكامل)

### 1. المصادقة اليدوية عبر `getUser()` في Edge Functions

تم التحقق من **كل وظيفة** — النتائج:

| الوظيفة | `getUser()` موجود؟ | ملاحظات |
|---------|-------------------|---------|
| `admin-manage-users` | ✅ سطر 37 | + تحقق من دور admin |
| `ai-assistant` | ✅ سطر 25 | + rate limiting 30/دقيقة |
| `check-contract-expiry` | ✅ سطر 51 | + timing-safe مقارنة service key للـ cron |
| `generate-invoice-pdf` | ✅ سطر 526 | + rate limiting 10/دقيقة |
| `webauthn` | ✅ سطر 54 | + rate limiting 10/دقيقة |
| `zatca-api` | ✅ سطر 234 | |
| `zatca-signer` | ✅ سطر 526 | |
| `zatca-xml-generator` | ✅ سطر 321 | |
| `guard-signup` | ✅ لا يحتاج (عامة) | rate limiting 5/دقيقة + fail-closed |
| `lookup-national-id` | ✅ لا يحتاج (عامة) | rate limiting 5/120ث + timing-safe |
| `auth-email-hook` | ✅ لا يحتاج (webhook) | `verifyWebhookRequest` من Lovable SDK |

**الحكم: 100% مطابق** — كل وظيفة حساسة تستخدم `getUser()`، والوظائف العامة محمية ببدائل مناسبة.

### 2. Rate Limiting المركزي

مُطبّق في **6 نقاط** عبر `check_rate_limit()` RPC:
- `guard-signup`: 5/60ث لكل IP
- `lookup-national-id`: 5/120ث لكل IP  
- `webauthn` (register): 10/60ث لكل مستخدم
- `webauthn` (auth): 10/60ث لكل IP
- `ai-assistant`: 30/60ث لكل مستخدم
- `generate-invoice-pdf`: 10/60ث لكل مستخدم

جميعها تطبّق **Fail-closed** (ترفض عند فشل فحص Rate Limit).

### 3. تشفير PII — AES-256 عبر pgcrypto

**مؤكد بالكامل** من migrations:
- `pgcrypto` مفعّل (`CREATE EXTENSION IF NOT EXISTS pgcrypto`)
- `pgp_sym_encrypt` / `pgp_sym_decrypt` مستخدمة للتشفير/فك التشفير
- Trigger تلقائي `encrypt_beneficiary_pii_trigger` على `BEFORE INSERT OR UPDATE`
- المفتاح مخزّن في `app_settings` بمفتاح `pii_encryption_key` (32 بايت عشوائي)
- المفتاح محمي بسياسة RLS تمنع قراءته من غير الأدمن
- تم تشفير البيانات التاريخية عبر migration مخصص

### 4. سجل المراجعة (Audit Log) — غير قابل للتعديل

**مؤكد** من RLS المعروض في السياق:
- `No one can delete audit_log`: `USING (false)`
- `No one can update audit_log`: `USING (false)`  
- `Only triggers can insert audit_log`: `WITH CHECK (false)`
- القراءة مقتصرة على admin + accountant

### 5. عزل بيانات المستفيدين

**مؤكد** — سياسات RESTRICTIVE على الجداول المالية:
- `distributions`: المستفيد يرى بياناته فقط عبر `beneficiary_id IN (SELECT ...)`
- `income/expenses/contracts/accounts`: سياسة `is_fiscal_year_accessible()` RESTRICTIVE تمنع رؤية السنوات غير المنشورة

### 6. `auth-email-hook` — التحقق عبر Webhook Signature

**مؤكد** — يستخدم `verifyWebhookRequest` من `@lovable.dev/webhooks-js` (سطر 4) بدلاً من مصادقة مستخدم.

---

## ⚠️ الفجوة المؤكدة — تعارض توثيقي

### `docs/API.md` سطر 182:
```
حماية: Rate limiting — 3 طلبات في الدقيقة لكل IP
```

### الكود الفعلي (`lookup-national-id/index.ts`):
```
RATE_LIMIT = 5
RATE_WINDOW_SECONDS = 120  // (5 طلبات كل دقيقتين)
```

**أيضاً** في سطر 188 من `docs/API.md`:
```
// نجاح: { email: 'user@example.com' }
```
لكن الكود الفعلي يُرجع `masked_email` (مثلاً `u***@example.com`) وليس البريد الكامل.

### الإصلاح المطلوب

تحديث `docs/API.md` أسطر 178-190 ليعكس:
1. Rate limit = 5 طلبات / 120 ثانية (ليس 3/دقيقة)
2. الاستجابة تُرجع `masked_email` وليس `email`
3. إضافة توثيق حقل `remaining` و `session` (عند تمرير كلمة مرور)

---

## ✅ تأكيدات إضافية من الفحص

| البند | الحالة |
|-------|--------|
| `beneficiaries_safe` VIEW مع `security_invoker` | ✅ موجود في migrations مع masking للـ PII |
| `contracts_safe` VIEW | ✅ موجود مع تقييد صلاحيات |
| `rate_limits` محمي بـ RLS `false` | ✅ لا وصول مباشر — فقط عبر `SECURITY DEFINER` RPC |
| `webauthn_challenges` محمي بـ RLS `false` | ✅ |
| `access_log` + `access_log_archive` غير قابلين للتعديل | ✅ RLS يمنع INSERT/UPDATE/DELETE |
| مفتاح التشفير محمي من الأدوار غير الأدمن | ✅ `key != 'pii_encryption_key'` في RLS |
| `check-contract-expiry` يقبل cron عبر service key | ✅ مقارنة timing-safe |

---

## الخطة التنفيذية

**مهمة واحدة فقط**: تحديث `docs/API.md` لإصلاح التعارض التوثيقي في وظيفة `lookup-national-id`:
- تصحيح rate limit من "3/دقيقة" إلى "5/120ث"
- تصحيح الاستجابة من `email` إلى `masked_email`
- إضافة توثيق الحقول الجديدة (`remaining`, `session`, `auth_error`)

