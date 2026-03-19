# إرشادات المعرفة الأمنية — نظام إدارة وقف مرزوق بن علي الثبيتي

## تصنيف المشروع

هذا **نظام إنتاجي حقيقي** يتعامل مع بيانات حساسة وليس نموذجاً أولياً أو بيئة تجريبية.

## سياق المستخدمين

| الدور | النوع | مستوى الثقة |
|-------|-------|------------|
| ناظر الوقف (admin) | مستخدم داخلي موثوق | عالي |
| محاسب (accountant) | مستخدم داخلي موثوق | عالي |
| مستفيد (beneficiary) | مستخدم خارجي | متوسط — قراءة فقط لبياناته |
| واقف (waqif) | مستخدم خارجي | متوسط — قراءة فقط |

## حساسية البيانات

```text
عالية جداً:
  ├─ أرقام الهوية الوطنية (مشفرة AES-256)
  ├─ أرقام الحسابات البنكية (مشفرة AES-256)
  └─ البريد الإلكتروني وأرقام الهواتف

عالية:
  ├─ البيانات المالية (إيرادات، مصروفات، حصص)
  ├─ العقود والفواتير الضريبية (ZATCA)
  └─ سجل المراجعة الجنائي (audit log)

متوسطة:
  ├─ بيانات العقارات والوحدات
  └─ اللوائح الداخلية
```

## طبقات الحماية المُطبَّقة فعلياً

1. **المصادقة**: تسجيل مقيّد عبر `guard-signup` + تحقق بالبريد الإلكتروني
2. **التفويض**: أدوار في `user_roles` + سياسات RLS تقييدية على 25 جدول
3. **التشفير**: AES-256 للبيانات الشخصية عبر `pgcrypto`، مفتاح التشفير في Supabase Vault (pgsodium)
4. **العزل**: كل مستفيد يرى بياناته فقط، السنوات غير المنشورة محجوبة
5. **Edge Functions**: مصادقة يدوية عبر `getUser()` مع تقييد معدل الطلبات
6. **سجل المراجعة**: غير قابل للتعديل أو الحذف، مع تمويه تلقائي للبيانات الحساسة

## توجيهات للماسح الأمني (Scanner Triage Rules)

### إنذارات كاذبة — تجاهل تلقائياً

| الملاحظة | السبب |
|----------|-------|
| `beneficiaries_safe` / `contracts_safe` بدون RLS | عروض VIEW بـ `security_invoker = true` + `security_barrier = true` — ترث سياسات RLS من الجداول الأصلية تلقائياً، والفلترة الإضافية تتم عبر `CASE WHEN has_role()` داخل العرض |
| تحذير `security_invoker VIEW` على العروض الآمنة | مقصود — العروض تقرأ بصلاحيات **المستخدم المستدعي** عبر وراثة RLS من الجداول الأصلية، مما يضمن أن كل مستخدم يرى فقط ما تسمح به سياسات الجدول الأصلي |
| ثغرات في حزم `devDependencies` (مثل `vite-plugin-pwa`) | أدوات بناء فقط، لا تُشحن مع كود الإنتاج |
| `verify_jwt = false` في Edge Functions | مقصود — Lovable Cloud يستخدم نظام مفاتيح توقيع مختلف، المصادقة تتم يدوياً عبر `getUser()` |

### نتائج تم حلها

| الملاحظة | الحل | تاريخ الحل |
|----------|------|-----------|
| `pgcrypto` في schema `public` | تم نقلها إلى `extensions` schema مع تحديث `search_path` لجميع الدوال المتأثرة (6 دوال: `encrypt_pii`, `decrypt_pii`, `encrypt_beneficiary_pii`, `get_active_zatca_certificate`, `lookup_by_national_id`, `encrypt_zatca_private_key`) | 2026-03-13 |
| وصول `waqif` لبيانات PII في `beneficiaries` | إزالة `waqif` من سياسة SELECT على الجدول الأصلي — الواقف يقرأ حصراً من `beneficiaries_safe` (`security_invoker` VIEW مع وراثة RLS) | 2026-03-13 |
| وصول `beneficiary`/`waqif` لهويات المستأجرين في `contracts` | إزالة الدورين من سياسة SELECT على الجدول الأصلي — يقرأون حصراً من `contracts_safe` (`security_invoker` VIEW مع وراثة RLS) + تحديث الواجهة لاستخدام `useContractsSafeByFiscalYear` | 2026-03-13 |
| 27 دالة حساسة مكشوفة لـ `anon` (بما فيها `get_pii_key`) | **الحل النهائي**: حماية داخلية في كود الدوال نفسها بدلاً من `REVOKE` (الذي يُلغيه `pg_dump` عند كل نشر). التفاصيل: (1) `get_pii_key()` تُرجع `NULL` عند `auth.uid() IS NULL`، (2) `decrypt_pii()` تُرجع `********` لغير المصرح لهم، (3) `get_beneficiary_decrypted()` و `lookup_by_national_id()` و `get_active_zatca_certificate()` تُطلق استثناء `غير مصرح`. **السبب الجذري**: منصة Lovable Cloud تُنفذ `pg_dump` migration بعد هجرات المطور عند كل نشر، و `CREATE OR REPLACE FUNCTION` يُعيد صلاحيات `EXECUTE` لـ `PUBLIC` تلقائياً مما يُبطل أي `REVOKE` سابق. الحماية الداخلية في كود الدالة لا تتأثر بهذه العملية. | 2026-03-13 |
| عروض `beneficiaries_safe` / `contracts_safe` مكشوفة لـ `anon` SELECT | تم سحب `SELECT` من `anon` و `PUBLIC` ومنحها لـ `authenticated` فقط (يُطبق عبر migration + حماية في كل نشر) | 2026-03-13 |
| العروض الآمنة تستخدم `SECURITY DEFINER` | تم تحويلها إلى `security_invoker = true` + `security_barrier = true` لوراثة RLS من الجداول الأصلية بدلاً من تجاوزها | 2026-03-18 |

### قواعد التصنيف العامة

- **إنذار كاذب**: أي ملاحظة `security_invoker VIEW` على `beneficiaries_safe` أو `contracts_safe` — مقصود لوراثة RLS مع تمويه البيانات حسب الدور عبر `CASE WHEN has_role()`
- **إنذار كاذب**: ثغرات في حزم `devDependencies` البحتة التي لا تُشحن للإنتاج
- **خطر مقبول**: إصدارات حزم بدون تحديث متاح upstream

### يتطلب إجراء فوري

- أي جدول جديد بدون سياسات RLS
- أي Edge Function بدون مصادقة (`getUser()` أو `getClaims()`)
- أي تسريب لبيانات PII غير مشفرة
- أي استخدام لـ `getSession()` بدلاً من `getUser()` في Edge Functions
- أي استخدام لـ `SUPABASE_SERVICE_ROLE_KEY` كبديل لمصادقة المستخدم

## مرجع الوظائف الآمنة (Edge Functions Auth Matrix)

| الوظيفة | نوع المصادقة | ملاحظات |
|---------|-------------|---------|
| `admin-manage-users` | `getUser()` + تحقق من دور admin | عمليات مميزة |
| `ai-assistant` | `getUser()` | نطاق المستخدم |
| `guard-signup` | عامة + rate limiting | تسجيل حسابات جديدة |
| `webauthn` | `getUser()` | إدارة بيانات اعتماد |
| `zatca-api` | `getUser()` + دور admin | تكامل ضريبي مع بوابة فاتورة |
| `zatca-signer` | `getUser()` + دور admin/accountant | توقيع فواتير رقمياً (ECDSA P-256) |
| `zatca-xml-generator` | `getUser()` + دور admin/accountant | إنشاء XML بصيغة UBL 2.1 |
| `check-contract-expiry` | Cron (خادم) | بدون مصادقة مستخدم |
| `generate-invoice-pdf` | `getUser()` | نطاق المستخدم |
| `lookup-national-id` | عامة + rate limiting + timing-safe | نقطة دخول المصادقة بالهوية — لا تتطلب جلسة مسبقة |
| `auth-email-hook` | Hook (Supabase) + webhook signature | بدون مصادقة مستخدم |

## نتائج اختبار الحماية على الإنتاج (2026-03-13)

تم التحقق من حماية الدوال الحساسة على بيئة الإنتاج (Live) عبر استدعاءات `anon` مباشرة:

| الدالة | النتيجة عبر anon | الحالة |
|--------|-----------------|--------|
| `get_pii_key()` | `NULL` | ✅ محمية |
| `decrypt_pii()` | `********` | ✅ محمية |
| `get_beneficiary_decrypted()` | خطأ: غير مصرح - يجب تسجيل الدخول | ✅ محمية |
| `execute_distribution()` | خطأ: غير مصرح بتنفيذ التوزيع | ✅ محمية |
| `close_fiscal_year()` | خطأ: فقط الناظر يمكنه إقفال السنة المالية | ✅ محمية |
| `notify_admins()` | خطأ: غير مصرح بإرسال إشعارات للمشرفين | ✅ محمية |

### ملاحظة مهمة حول pg_dump و Lovable Cloud

عند النشر، تُنفذ منصة Lovable Cloud هجرة `pg_dump` تُعيد إنشاء جميع الدوال عبر `CREATE OR REPLACE FUNCTION`. هذا يُعيد صلاحيات `EXECUTE` لـ `PUBLIC` تلقائياً، مما يُبطل أي `REVOKE` سابق.

**الحل المعتمد**: بدلاً من الاعتماد على `REVOKE EXECUTE` (غير مستدام مع pg_dump)، تم تضمين فحوصات أمنية **داخل كود الدوال نفسها**:

```sql
-- نمط الحماية المُطبَّق في كل دالة حساسة
IF auth.uid() IS NULL THEN
  RETURN NULL;  -- أو RAISE EXCEPTION
END IF;
IF NOT public.has_role(auth.uid(), 'admin') THEN
  RAISE EXCEPTION 'غير مصرح';
END IF;
```

هذا النهج **لا يتأثر بإعادة إنشاء الدوال** لأن الحماية جزء من كود الدالة المُصدَّر مع pg_dump.

## سياسة أمان المحتوى (CSP)

### الوضع الحالي

CSP مُعرَّفة كـ `<meta http-equiv>` في `index.html` (سطر 6). هذا يوفر حماية جيدة لكنه **أقل أماناً** من HTTP Header لأن:
- `meta` tag لا يدعم `frame-ancestors` و `report-uri`
- يمكن تجاوزه نظرياً عبر حقن HTML قبل العلامة

### السياسة المُطبَّقة

```
default-src 'self';
script-src 'self' https://*.supabase.co;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data: blob: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
worker-src 'self';
manifest-src 'self';
```

### الترقية المُوصى بها — HTTP Header

عند النشر على خادم يدعم ترويسات مخصصة (Netlify / Vercel / Cloudflare)، يُفضل نقل CSP إلى HTTP Header:

**Netlify** (`_headers`):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://*.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://*.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

**ملاحظة**: على Lovable Cloud، CSP عبر `meta` tag هو الخيار الوحيد المتاح حالياً. عند الانتقال لاستضافة مخصصة، يجب تطبيق HTTP Header وإزالة `meta` tag من `index.html`.
