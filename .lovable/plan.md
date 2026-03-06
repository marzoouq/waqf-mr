

# خطة إصلاح الجولة الخامسة — بعد التحقق العميق

## نتائج التحقق الفعلية

### مشاكل التقرير الخاطئة (مُلغاة):

| المشكلة المُبلَّغة | الحقيقة |
|---|---|
| #1 — `client_error` مرفوض من DB | **خاطئ** — المهاجرة الأخيرة `20260226` أزالت كل قيود `event_type`. الدالة الحالية تقبل أي نوع |
| #3 — DataExportTab يُصدّر PII | **مُصلح فعلاً** — الكود الحالي يستبعد `national_id` و `bank_account` |
| #4 — GlobalSearch يكشف tenant_name | **مُصلح فعلاً** — السطر 91 يعرض `حالة: ${c.status}` لغير الأدمن |
| #9 — BeneficiarySettingsPage يعرض base64 | **مُصلح فعلاً** — يعرض `'********'` ثابت |
| #5 — audit_log تاريخي بـ PII نصية | مشكلة بيانات تاريخية — لا يمكن إصلاحها بتغيير كود |
| #7 — DataExportTab يُصدّر contracts | المحاسب مصرح له بالعقود — سلوك متوقع |

### مشاكل حقيقية تحتاج إصلاح (3 إصلاحات):

---

## 1. `beneficiaries_safe` View — تعرض آخر 4 أحرف من base64 المشفر
**المصدر:** المهاجرة `20260302220345` سطر 11

المشكلة: `'******' || right(national_id, 4)` يأخذ آخر 4 أحرف من النص المشفر (base64) وليس من الرقم الأصلي. المستفيد يرى أحرفاً عشوائية.

**الإصلاح:** مهاجرة جديدة تُعيد إنشاء الـ View بقناع ثابت `'********'` بدل `right()`:
```sql
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe WITH (security_invoker=on) AS
SELECT id, name, share_percentage,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN national_id
    ELSE CASE WHEN national_id IS NOT NULL THEN '********' ELSE NULL END
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN bank_account
    ELSE CASE WHEN bank_account IS NOT NULL THEN '********' ELSE NULL END
  END AS bank_account,
  email, phone, notes, user_id, created_at, updated_at
FROM beneficiaries;
```

---

## 2. `pii_encryption_key` مقروء من المستفيدين عبر RLS
**المصدر:** سياسة "Authorized roles can read settings" تسمح لكل الأدوار بقراءة كل `app_settings`

المشكلة: أي مستفيد يمكنه قراءة `pii_encryption_key` مباشرة. رغم أن الأثر العملي محدود (المستفيد لا يقرأ إلا سجله الخاص)، هذا يخالف مبدأ defense-in-depth.

**الإصلاح:** مهاجرة جديدة تُضيف سياسة RLS تحجب المفتاح عن غير الأدمن:
```sql
-- تعديل سياسة القراءة: استبعاد pii_encryption_key من غير الأدمن
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
ON public.app_settings FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'))
  OR (
    (has_role(auth.uid(), 'beneficiary') OR has_role(auth.uid(), 'waqif') OR has_role(auth.uid(), 'accountant'))
    AND key != 'pii_encryption_key'
  )
);
```

---

## 3. REVOKE `cron_check_late_payments` من `authenticated` (defense-in-depth)
**المصدر:** المهاجرة `20260227110730` سطر 105

المشكلة: `GRANT EXECUTE TO authenticated` لا يزال قائماً رغم أن الدالة تتحقق داخلياً من الدور. سحب الصلاحية يُطبّق مبدأ least privilege.

**الإصلاح:** مهاجرة بسيطة:
```sql
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM authenticated;
```

---

## ملخص التغييرات

| النوع | التغيير |
|---|---|
| مهاجرة DB | إعادة إنشاء `beneficiaries_safe` بقناع ثابت |
| مهاجرة DB | تقييد قراءة `pii_encryption_key` على الأدمن فقط |
| مهاجرة DB | سحب صلاحية تنفيذ `cron_check_late_payments` |

3 مهاجرات قاعدة بيانات. لا تغييرات في كود TypeScript.

