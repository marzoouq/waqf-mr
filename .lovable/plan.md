

# إصلاح 3 مشاكل حقيقية مؤكدة

## المشاكل المؤكدة بعد التحقق

| # | الخطورة | المشكلة | الحالة |
|---|---------|---------|--------|
| 1 | تم إصلاحه | تشفير PII + trigger | لا يحتاج عمل |
| 2 | ليس باغ | ON CONFLICT — الـ constraint متطابقة `(contract_id, payment_number, fiscal_year_id)` | لا يحتاج عمل |
| 3 | MEDIUM | `beneficiaries_safe` يقنّع PII للمحاسب | يحتاج إصلاح |
| 4 | MEDIUM | `validate_advance` يقسم على 100 بدل مجموع النسب | يحتاج إصلاح |
| 5 | غير موجود | `waqfCapital` — لا يوجد في الكود | لا يحتاج عمل |
| 6 | ليس باغ | `paid_months/12` — يتعامل مع كل أنواع الدفع | لا يحتاج عمل |
| 7 | LOW | `cron_check_late_payments` — تنبيهات خاطئة لعقود طويلة | يحتاج إصلاح |

---

## الإصلاح 1: `beneficiaries_safe` — إضافة المحاسب

**Migration SQL:**
```sql
CREATE OR REPLACE VIEW public.beneficiaries_safe
WITH (security_invoker=on) AS
SELECT
  id, name, share_percentage, email, phone, notes, user_id, created_at, updated_at,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
    THEN national_id
    ELSE '******' || right(national_id, 4)
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
    THEN bank_account
    ELSE '******' || right(bank_account, 4)
  END AS bank_account
FROM beneficiaries;
```

---

## الإصلاح 2: `validate_advance_request_amount` — استخدام مجموع النسب التناسبي

**المشكلة:** الدالة تحسب `v_estimated_share := v_available_amount * v_share_pct / 100` وهذا خاطئ إذا كان مجموع نسب المستفيدين لا يساوي 100%.

**الإصلاح:**
```sql
-- بدل:
v_estimated_share := v_available_amount * v_share_pct / 100;

-- يصبح:
DECLARE
  v_total_pct numeric;
...
SELECT COALESCE(SUM(share_percentage), 100) INTO v_total_pct FROM beneficiaries;
v_estimated_share := v_available_amount * v_share_pct / v_total_pct;
```

هذا يتسق مع منطق التوزيع التناسبي المستخدم في `execute_distribution` والواجهة الأمامية.

---

## الإصلاح 3: `cron_check_late_payments` — تحديد سقف بـ `end_date`

**المشكلة:** `total_months` يُحسب من `start_date` إلى اليوم بدون مراعاة `end_date`. عقد انتهى قبل 6 أشهر لكنه لا يزال `active` (لم يتم تحديثه) سيُولّد تنبيهات خاطئة.

**الإصلاح:**
```sql
-- بدل:
total_months := GREATEST(0,
  (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM rec.start_date)) * 12
  + (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM rec.start_date))
);

-- يصبح:
total_months := GREATEST(0,
  (EXTRACT(YEAR FROM LEAST(CURRENT_DATE, rec.end_date)) - EXTRACT(YEAR FROM rec.start_date)) * 12
  + (EXTRACT(MONTH FROM LEAST(CURRENT_DATE, rec.end_date)) - EXTRACT(MONTH FROM rec.start_date))
);
```

استخدام `LEAST(CURRENT_DATE, rec.end_date)` يمنع حساب أشهر بعد انتهاء العقد.

---

## ملخص التغييرات

| الملف | التغيير |
|---|---|
| `supabase/migrations/[new].sql` | 3 إصلاحات: View + validate_advance + cron |
| لا تغييرات في الكود | جميع الإصلاحات في قاعدة البيانات فقط |

