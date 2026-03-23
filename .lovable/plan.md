

# تقرير الفحص الجنائي — السبب الجذري الحقيقي

---

## 1. النتيجة المباشرة

### المشكلة 1: `beneficiaries_safe` — مشكلة حقيقية في الصلاحيات

**السبب الجذري:** Supabase يضبط `pg_default_acl` لمنح ALL permissions تلقائياً لـ `authenticated` على كل كائن جديد ينشئه `postgres`. عندما تنفذ الترحيلات:

```text
1. DROP VIEW → يُحذف العرض
2. CREATE VIEW → يُنشأ + تُطبق default privileges = ALL لـ authenticated
3. REVOKE ALL FROM PUBLIC → يُزيل من PUBLIC فقط
4. REVOKE ALL FROM anon → يُزيل من anon ✅
5. GRANT SELECT TO authenticated → SELECT كان موجوداً أصلاً + INSERT/UPDATE/DELETE لا تزال!
```

**الخطأ:** الترحيل لم يتضمن `REVOKE ALL FROM authenticated` قبل `GRANT SELECT`.

**الدليل المباشر من قاعدة البيانات:**

| الصلاحية | anon | authenticated |
|----------|------|--------------|
| SELECT | ❌ | ✅ |
| INSERT | ❌ | ✅ ← خطأ |
| DELETE | ❌ | ✅ ← خطأ |

نفس المشكلة تطال `contracts_safe`.

**ملاحظة:** الخطر العملي منخفض لأن INSERT/DELETE على VIEW بدون قواعد (rules) يفشل. لكن الصلاحيات الزائدة يجب إزالتها.

### المشكلة 2: `user_roles` — إيجابي كاذب مؤكد

**الدليل:** استعلمت `pg_policy` مباشرة وأكدت وجود:
- `"Only admins can modify roles"` — `polpermissive: false` (RESTRICTIVE) — مُطبقة فعلاً ✅

الماسح لا يتعرف على السياسة التقييدية الموجودة.

---

## 2. الإصلاح المطلوب

### ترحيل واحد بسيط

```sql
-- إصلاح صلاحيات beneficiaries_safe
REVOKE ALL ON public.beneficiaries_safe FROM authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- إصلاح صلاحيات contracts_safe
REVOKE ALL ON public.contracts_safe FROM authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;
```

### تجاهل نتيجة `user_roles` في الماسح

توثيق أن السياسة التقييدية مُطبقة فعلاً وتجاهل التحذير.

---

## 3. التفاصيل التقنية

**لماذا حدث هذا؟** Supabase يُعيّن default privileges على مستوى الـ role:

```text
defaclobjtype: r (relation/table/view)
defaclrole: postgres
anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm
```

أي كائن يُنشئه `postgres` (وهو من ينفذ الترحيلات) يحصل تلقائياً على ALL grants لجميع الأدوار. لذلك **يجب دائماً** عمل `REVOKE ALL FROM authenticated` بشكل صريح قبل `GRANT SELECT`.

