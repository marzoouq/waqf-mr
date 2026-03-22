

# فحص جذري عميق — جميع التحذيرات والإيجابيات الكاذبة

---

## المنهجية

تتبع كل تحذير من 4 ماسحات أمنية (agent_security, supabase, supabase_lov, connector) مقابل الكود الفعلي وقاعدة البيانات الحية عبر استعلامات SQL مباشرة.

---

## التحذيرات الفعلية (غير مؤجلة)

### 🔴 W-01: `contracts_safe` بلا RLS (supabase_lov — ERROR)

**التحذير:** "Tenant personal data in contracts_safe is unprotected by RLS policies"

**السيناريو المباشر:**
```
مستخدم authenticated → SELECT * FROM contracts_safe → هل يرى بيانات حساسة؟
```

**نتيجة الفحص على الكود:**
```sql
-- reloptions من قاعدة البيانات الحية:
security_invoker=false, security_barrier=true
```
- العرض يعمل بصلاحيات المالك (SECURITY DEFINER) ← يتجاوز RLS على `contracts`
- CASE WHEN يُخفي: `tenant_id_number, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, notes, tenant_id_type` → NULL لغير الناظر/المحاسب
- `tenant_name, contract_number, rent_amount, dates` مكشوفة لجميع authenticated
- `anon` لا يستطيع القراءة (REVOKE مؤكد)

**الحكم:** ✅ **إيجابية كاذبة** — PostgreSQL لا يدعم RLS على العروض. SECURITY DEFINER + CASE WHEN + REVOKE anon هو النمط الصحيح. البيانات غير المقنّعة (اسم المستأجر، المبلغ) مطلوبة وظيفياً للمستفيد والواقف.

---

### 🟡 W-02: الواقف يرى جميع المستفيدين في الجدول الخام (supabase_lov — WARN)

**التحذير:** "Waqif role can read all beneficiaries' private contact and financial details"

**السيناريو المباشر:**
```
واقف → supabase.from('beneficiaries').select('*') → ماذا يرى؟
```

**نتيجة الفحص:**
- سياسة RLS: `"Waqif can view beneficiaries"` → SELECT على **كل** الصفوف
- `national_id` و `bank_account` → مشفرة (ciphertext) + دوال فك التشفير محظورة على authenticated → **لا تسريب**
- `email` و `phone` → **نص عادي في الجدول الخام!**
- الكود الفعلي: جميع واجهات الواقف تستخدم `beneficiaries_safe` (security_invoker=true) حيث CASE WHEN يُخفي email/phone
- **لكن**: واقف متقدم تقنياً يستطيع استدعاء REST API مباشرة على الجدول الخام وقراءة email/phone لجميع المستفيدين

**سبب الإبقاء على السياسة:** `beneficiaries_safe` يستخدم `security_invoker=true` ← RLS يُطبَّق ← إزالة سياسة waqif من الجدول الخام ستمنع الواقف من القراءة عبر العرض أيضاً.

**الإصلاح الجذري:** تحويل `beneficiaries_safe` إلى `security_invoker=false` (مثل `contracts_safe`) ← ثم حذف سياسة waqif من الجدول الخام ← الواقف يقرأ فقط عبر العرض مع تقنيع PII.

**الحكم:** 🟡 **ثغرة حقيقية منخفضة** — تحتاج إصلاح لتوحيد النمط مع `contracts_safe`.

---

### 🟡 W-03: سياسة user_roles على دور `public` (S-01 سابق — لم يُنفَّذ)

**التحذير:** "Admins can manage all roles" تستهدف `{-}` (public) بدل `{authenticated}`

**السيناريو المباشر:**
```
anon → SELECT/INSERT/UPDATE/DELETE FROM user_roles → هل ينجح؟
```

**نتيجة الفحص:**
```sql
polroles: {-}  -- يعني public (يشمل anon نظرياً)
using_expr: has_role(auth.uid(), 'admin')  -- auth.uid() = NULL لـ anon → false دائماً
```

**الحكم:** 🟡 **تحصين دفاعي** — لا خطر فعلي لأن `has_role(NULL, 'admin')` = false. لكن تقييد السياسة لـ `authenticated` أفضل ممارسة.

---

## التحذيرات المؤجلة (ignored) — تحقق جذري

### ✅ I-01: العروض الآمنة محمية (agent_security)

**التحقق:** استعلام مباشر أكد:
- `beneficiaries_safe`: `security_invoker=true, security_barrier=true`
- `contracts_safe`: `security_invoker=false, security_barrier=true`

**⚠️ تناقض في التوثيق:** سبب التأجيل يقول "security_invoker=true على كلا العرضين" — لكن `contracts_safe` فعلياً `security_invoker=false`. التوثيق خاطئ لكن الحماية سليمة.

### ✅ I-02: National-ID Lookup (agent_security)

**التحقق:** الحماية مؤكدة — rate limit + progressive delay + masked email + unified response.

### ✅ I-03: Security Definer View bypass (agent_security)

**التحقق:** نفس I-01. التفاصيل في الـ details تذكر `security_invoker=false` بشكل صحيح لكن سبب التأجيل يناقضها. العروض تعمل بالنمط الصحيح.

### ✅ I-04: PII Key في Vault (agent_security)

**التحقق:** المفتاح في `vault.decrypted_secrets` مؤكد. محذوف من `app_settings`. دوال التشفير محظورة على authenticated.

### ✅ I-05: contracts_safe PII (agent_security)

**التحقق:** مغطى بـ W-01 أعلاه — CASE WHEN يُخفي PII.

### ✅ I-06: Raw contracts PII bypass (agent_security)

**التحقق:** RLS على `contracts` الخام يقصر SELECT على admin+accountant فقط. مؤكد.

### ✅ I-07: Extension in Public (supabase)

**التحقق المباشر:**
```
pgcrypto → extensions schema ✅
uuid-ossp → extensions schema ✅
supabase_vault → vault schema ✅
pg_net → extensions schema ✅
```
**صفر إضافات في public schema.** إيجابية كاذبة مؤكدة.

### ✅ I-08: Security Definer View (supabase)

**التحقق:** مقصود بالتصميم لـ `contracts_safe`. `beneficiaries_safe` يستخدم INVOKER. كلاهما مع `security_barrier=true`.

---

## ملخص النتائج

| # | التحذير | المصدر | الحكم الجذري | إصلاح؟ |
|---|---------|--------|-------------|--------|
| W-01 | contracts_safe بلا RLS | supabase_lov | ✅ إيجابية كاذبة (views لا تدعم RLS) | لا |
| W-02 | واقف يقرأ beneficiaries خام | supabase_lov | 🟡 ثغرة حقيقية منخفضة | **نعم** |
| W-03 | user_roles على public role | S-01 | 🟡 تحصين دفاعي | **نعم** |
| I-01→I-08 | 8 بنود مؤجلة | agent+supabase | ✅ سليمة (مع خطأ توثيقي في I-01) | لا |

---

## الإصلاح المقترح — Migration واحدة

### إصلاح W-02: توحيد `beneficiaries_safe` مع نمط `contracts_safe`

```sql
-- 1. تحويل beneficiaries_safe إلى SECURITY DEFINER (مثل contracts_safe)
CREATE OR REPLACE VIEW public.beneficiaries_safe
WITH (security_invoker = false, security_barrier = true)
AS SELECT ... [نفس التعريف الحالي مع CASE WHEN];

-- 2. حذف سياسة waqif من الجدول الخام
DROP POLICY "Waqif can view beneficiaries" ON public.beneficiaries;

-- 3. ضمان GRANT للعرض
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
REVOKE ALL ON public.beneficiaries_safe FROM anon;
```

### إصلاح W-03: تقييد user_roles لـ authenticated

```sql
DROP POLICY "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### تحديث ignore_reason لـ I-01

تصحيح سبب التأجيل ليعكس الواقع: `contracts_safe` = `security_invoker=false`, `beneficiaries_safe` = `security_invoker=false` (بعد الإصلاح).

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration SQL | إصلاح W-02 + W-03 |
| `docs/CHANGELOG.md` | توثيق الإصلاحين |

