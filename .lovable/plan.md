

# تقرير فحص الأمان الشامل — مارس 2026

---

## ملخص تنفيذي

تم إجراء فحص أمني شامل باستخدام أدوات الماسح الأمني + فحص يدوي للكود. المشروع في حالة أمنية **ممتازة** مع **ملاحظة واحدة قابلة للتحسين**.

---

## 1. مصادقة Edge Functions — ✅ ممتازة

جميع الوظائف الـ 8 التي تتطلب مصادقة تستخدم `getUser()` (التحقق من الخادم):

| الوظيفة | Auth | Rate Limit | Role Check |
|---------|------|------------|------------|
| `admin-manage-users` | ✅ getUser | ✅ | ✅ admin |
| `ai-assistant` | ✅ getUser | ✅ 30/min | ✅ |
| `webauthn` | ✅ getUser | ✅ 10/min | ✅ |
| `zatca-api` | ✅ getUser | ✅ 30/min | ✅ admin |
| `zatca-signer` | ✅ getUser | ✅ 20/min | ✅ admin |
| `zatca-xml-generator` | ✅ getUser | ✅ 30/min | ✅ admin |
| `generate-invoice-pdf` | ✅ getUser | ✅ 10/min | ✅ |
| `check-contract-expiry` | ✅ getUser | N/A (cron) | ✅ |

**لا يوجد استخدام لـ `getSession()`.** ✅

---

## 2. العروض الآمنة (Safe Views) — ✅ محمية بالتصميم

| العرض | security_invoker | security_barrier | PII Masking |
|-------|-----------------|-----------------|-------------|
| `beneficiaries_safe` | `false` (DEFINER) | `true` | ✅ CASE WHEN |
| `contracts_safe` | `false` (DEFINER) | `true` | ✅ CASE WHEN |

**ملاحظة الماسح الأمني:** يُبلّغ عن "لا توجد سياسات RLS" على هذه العروض. هذا **إيجابي كاذب** — العروض مصممة كـ Security Definer عمداً لتمكين أدوار المستفيد والواقف من الوصول عبر تقنيع PII. الحماية تتم عبر `CASE WHEN has_role()` داخل العرض نفسه.

**الإجراء:** تحديث حالة هذه النتائج في الماسح الأمني لتصنيفها كـ "مقصودة بالتصميم" (ignore).

---

## 3. سياسة user_roles — ⚠️ تحسين مطلوب

| السياسة | الأدوار الحالية | الأدوار المطلوبة |
|---------|----------------|-----------------|
| `Users can view their own roles` | `{public}` | `{authenticated}` |
| `Admins can manage all roles` | `{authenticated}` ✅ | — |

**المشكلة:** سياسة `Users can view their own roles` تستهدف `public` (جميع المستخدمين بما فيهم غير المصادق عليهم). عملياً `auth.uid() = NULL` للمجهولين فلا يحدث تسريب، لكنه **تناقض تصريحي** يجب تنظيفه.

**الإجراء:** تغيير السياسة لتستهدف `{authenticated}` فقط — سطر SQL واحد.

---

## 4. تشفير البيانات الحساسة — ✅ محصّن

| البند | الحالة |
|-------|--------|
| مفتاح PII في Supabase Vault | ✅ (ليس في app_settings) |
| `encrypt_pii` / `decrypt_pii` محظورة على authenticated | ✅ (service_role فقط) |
| `get_pii_key` محظورة على authenticated | ✅ |
| شهادات ZATCA مقيدة بـ admin | ✅ |
| تخزين الفواتير بـ MIME types محددة | ✅ (PDF + صور فقط) |
| روابط التحميل موقعة (300 ثانية) | ✅ |

---

## 5. حماية البيانات المالية — ✅ شاملة

| الآلية | التغطية |
|--------|---------|
| RLS على جميع الجداول | 37/37 ✅ |
| سياسات RESTRICTIVE للسنوات غير المنشورة | 10 جداول ✅ |
| Trigger منع تعديل السنوات المقفلة | 5 جداول ✅ |
| Audit logging | 10 جداول أساسية ✅ |
| سجلات الوصول immutable | access_log + archive ✅ |
| Rate limits محمية بـ `USING(false)` | ✅ |

---

## 6. صلاحيات الدور المجهول (anon) — ✅ محصّنة

| البند | الحالة |
|-------|--------|
| `REVOKE ALL` من anon على جميع الجداول | ✅ |
| استثناء: `app_settings` (registration_enabled فقط) | ✅ |
| استثناء: `has_role` + `get_public_stats` | ✅ |
| Event Trigger لسحب صلاحيات الدوال الجديدة تلقائياً | ✅ |

---

## 7. حماية الرسائل — ✅ محصّنة

| البند | الحالة |
|-------|--------|
| UPDATE يسمح بتغيير `is_read` فقط | ✅ WITH CHECK |
| `content` و `sender_id` محميان ضد التعديل | ✅ |
| DELETE للأدمن فقط | ✅ |

---

## 8. ملخص نتائج الماسح الأمني

| النتيجة | المستوى | الحالة |
|---------|---------|--------|
| Security Definer Views (×2) | error | ✅ إيجابي كاذب — مقصود بالتصميم |
| Extension in Public | warn | ✅ إيجابي كاذب — pgcrypto في extensions |
| beneficiaries_safe no RLS | error | ✅ إيجابي كاذب — DEFINER + CASE WHEN |
| contracts_safe no RLS | error | ✅ إيجابي كاذب — DEFINER + CASE WHEN |
| user_roles policy on public | warn | ⚠️ **يحتاج تنظيف** |

---

## 9. الإجراءات المطلوبة

| # | الإجراء | الأولوية | الجهد |
|---|---------|----------|-------|
| 1 | تغيير سياسة `Users can view their own roles` لتستهدف `{authenticated}` بدلاً من `{public}` | منخفضة | سطر SQL واحد |
| 2 | تحديث نتائج الماسح الأمني لتصنيف الإيجابيات الكاذبة كـ "ignored" | تنظيفي | أداة الماسح فقط |

---

## الخلاصة

```text
╔══════════════════════════════════════════════╗
║  تقييم الأمان العام: ✅ ممتاز               ║
╠══════════════════════════════════════════════╣
║  Edge Functions Auth: getUser() شامل        ║
║  RLS Coverage: 37/37 (100%)                 ║
║  PII Encryption: Vault + SECURITY DEFINER   ║
║  Anon Hardening: REVOKE ALL + Event Trigger ║
║  Rate Limiting: جميع الوظائف الحساسة        ║
║  مشاكل حرجة: 0                              ║
║  تحسينات تنظيفية: 1 (user_roles policy)     ║
╚══════════════════════════════════════════════╝
```

