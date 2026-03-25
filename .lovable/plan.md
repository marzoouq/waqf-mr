

# تقرير الفحص الجنائي الشامل — ملفات Migrations

## المنهجية
فحص 241 ملف migration عبر: بحث regex معمّق + قراءة الملفات الحرجة + فحص أمني آلي (Security Scan + Linter) + تحقق من الحالة النهائية للقاعدة.

---

## 1. نظرة عامة على الهجرات

| البند | التفاصيل |
|---|---|
| **إجمالي الملفات** | 241 migration |
| **الفترة** | 9 فبراير — 25 مارس 2026 (45 يوم) |
| **معدل** | ~5.4 migration/يوم — معدل تطوير عالٍ جداً |
| **العمليات التدميرية** | 1 فقط (`DROP COLUMN waqf_capital`) — مُبرر ومُوثّق |
| **الجداول المُنشأة** | ~24 جدول |
| **الدوال** | 690+ إنشاء/تحديث دالة عبر `CREATE OR REPLACE` |
| **GRANT/REVOKE** | 644+ عملية ضبط صلاحيات |

---

## 2. نتائج الفحص الآلي (Security Scan + Linter)

### ⚠️ 4 ملاحظات تحتاج إصلاح

| # | الخطورة | المشكلة | التفصيل |
|---|---|---|---|
| 1 | 🔴 ERROR | Security Definer View × 2 | العروض `beneficiaries_safe` و `contracts_safe` مُعرّفة بـ `security_invoker=false` — هذا يُنفّذ RLS بصلاحيات مُنشئ العرض لا المستخدم الفعلي |
| 2 | 🔴 ERROR | بيانات حساسة مكشوفة | `contracts_safe` و `beneficiaries_safe` لا تملك سياسات RLS (العروض لا تدعم RLS في PostgreSQL) |
| 3 | ⚠️ WARN | Extension في public | `pgcrypto` مُثبّت في schema `public` |
| 4 | ⚠️ WARN | سياسة على `{public}` | `advance_carryforward` — سياسة "Beneficiaries can view own carryforward" تُطبّق على `{public}` بدلاً من `{authenticated}` |

### تحليل عميق لكل ملاحظة:

**الملاحظة 1+2 (العروض الآمنة):**
هذه **ليست ثغرة فعلية** لأن:
- Migration `20260318170554` يسحب كل الصلاحيات ويمنح `SELECT` فقط لـ `authenticated`
- العروض تُقنّع PII داخلياً عبر `CASE WHEN has_role()`
- `anon` لا يملك أي صلاحية على العروض
- لكن Linter يُنبّه لأن `security_invoker=false` هو نمط خطير عموماً — يُفضّل التحويل لـ `security_invoker=true`

**الملاحظة 3 (pgcrypto في public):**
ملاحظة منخفضة — `pgcrypto` في `public` هو النمط الافتراضي لـ Supabase. نقلها لـ `extensions` يتطلب تعديل كل الدوال التي تستخدمها.

**الملاحظة 4 (advance_carryforward):**
السياسة تعمل بأمان لأن `auth.uid()` تُرجع `NULL` لـ `anon` فلا تُرجع صفوفاً. لكن الأفضل تقييدها لـ `authenticated`.

---

## 3. فحص سلامة التسلسل الزمني

### ✅ سليم
- جميع الهجرات مرتبة زمنياً بشكل صحيح (timestamps تصاعدية)
- لا يوجد تعارض في الترتيب
- الهجرات اللاحقة تستخدم `IF NOT EXISTS` و `DROP ... IF EXISTS` لضمان الـ idempotency
- `CREATE OR REPLACE FUNCTION` يُستخدم بشكل صحيح — لا يوجد `CREATE FUNCTION` بدون حماية

---

## 4. فحص الدوال (SECURITY DEFINER)

### ✅ ممتاز
- **كل** دالة `SECURITY DEFINER` تتضمن `SET search_path` ✅ (يمنع search_path injection)
- الدوال الحساسة (PII, ZATCA) محمية بـ `REVOKE EXECUTE FROM PUBLIC/anon` ✅
- `get_pii_key()` تتحقق من `auth.uid() IS NULL` قبل الإرجاع ✅
- Migration `20260313184902` يسحب الصلاحيات من كل الدوال ثم يُعيد منحها انتقائياً ✅
- `ALTER DEFAULT PRIVILEGES` يمنع منح صلاحيات تلقائية لـ anon على الدوال المستقبلية ✅

---

## 5. فحص سياسات RLS

### ✅ قوي
- كل جدول يستخدم `ENABLE ROW LEVEL SECURITY` ✅
- `user_roles` محمي بسياسات RESTRICTIVE تمنع privilege escalation ✅
- `access_log` و `access_log_archive` محميان ضد INSERT/UPDATE/DELETE ✅
- `rate_limits` محمي بـ `USING (false)` — لا وصول مباشر ✅
- الجداول المالية تستخدم `is_fiscal_year_accessible()` كسياسة RESTRICTIVE ✅

---

## 6. فحص العمليات التدميرية

### ✅ آمن
- **DROP COLUMN واحد فقط**: `waqf_capital` من `accounts` — مُوثّق ومُبرر (تم استبداله بـ `waqf_corpus_manual` + `waqf_corpus_previous`)
- لا يوجد `DROP TABLE` على جداول تحتوي بيانات
- لا يوجد `TRUNCATE` على جداول إنتاجية
- Foreign keys تم تحويلها من `ON DELETE SET NULL` إلى `ON DELETE RESTRICT` في migration `20260323001534` — تصحيح مهم وسليم

---

## 7. أنماط مُقلقة (لكن مُعالجة)

### العروض أُعيد إنشاؤها عدة مرات
- `beneficiaries_safe` أُعيد إنشاؤها **7+ مرات** عبر الهجرات
- `contracts_safe` أُعيد إنشاؤها **5+ مرات**
- السبب: تبديل بين `security_invoker=true` و `false` لحل مشاكل التوافق مع RLS
- **الحالة النهائية**: `security_invoker=false` + `security_barrier=true` + PII masking عبر `CASE WHEN` + `GRANT SELECT TO authenticated` فقط

هذا ليس خطأً — إنما يعكس عملية تطوير تكرارية لإيجاد التوازن الأمثل بين الأمان وإمكانية الوصول.

---

## 8. الخطة المقترحة — 3 إصلاحات

### الإصلاح 1: تقييد سياسة `advance_carryforward` لـ `authenticated`
```sql
DROP POLICY "Beneficiaries can view own carryforward" ON public.advance_carryforward;
CREATE POLICY "Beneficiaries can view own carryforward"
  ON public.advance_carryforward FOR SELECT
  TO authenticated
  USING (beneficiary_id IN (
    SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
  ));
```

### الإصلاح 2: تحويل `contracts_safe` إلى `security_invoker=true`
إعادة إنشاء العرض مع `security_invoker=true` بدلاً من `false`. هذا يتطلب ضمان أن RLS على `contracts` يسمح لـ beneficiary/waqif بالقراءة — أو إضافة سياسة SELECT مناسبة.

### الإصلاح 3: تحويل `beneficiaries_safe` إلى `security_invoker=true`
نفس المنطق — مع ضمان أن سياسة "Beneficiaries can view their own data" كافية.

> **ملاحظة**: الإصلاحان 2 و 3 قد يكسران الوصول الحالي لـ beneficiary/waqif عبر العروض، لأن `security_invoker=true` يعني أن RLS على الجدول الأصلي سيُطبّق. يجب إضافة سياسات SELECT مناسبة على `contracts` و `beneficiaries` أولاً.

---

## الخلاصة

```text
╔══════════════════════════════════╦════════╗
║ البند                            ║ الحالة  ║
╠══════════════════════════════════╬════════╣
║ الترتيب الزمني                    ║  ✅    ║
║ Idempotency (IF NOT EXISTS)       ║  ✅    ║
║ SECURITY DEFINER + search_path    ║  ✅    ║
║ RLS على كل الجداول               ║  ✅    ║
║ GRANT/REVOKE (defense in depth)   ║  ✅    ║
║ عمليات تدميرية                    ║  ✅    ║
║ Polymorphic FK validation         ║  ✅    ║
║ Fiscal year access control        ║  ✅    ║
║ سياسة advance_carryforward        ║  ⚠️   ║
║ Security Definer Views            ║  ⚠️   ║
╠══════════════════════════════════╬════════╣
║ ثغرات حرجة                       ║  0     ║
║ ملاحظات تحتاج إصلاح              ║  2     ║
║ ملاحظات منخفضة (pgcrypto)         ║  1     ║
╚══════════════════════════════════╩════════╝
```

**الحكم**: الهجرات سليمة ومتسقة. لا ثغرات حرجة. إصلاحان مطلوبان: تقييد سياسة `advance_carryforward` + معالجة تحذير Security Definer Views.

هل تريد تنفيذ الإصلاحات الثلاثة؟

