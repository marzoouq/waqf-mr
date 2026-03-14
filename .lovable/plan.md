

# تحقق من بنود الجولة الخامسة — بند بند

## ملخص سريع

من 12 بنداً: **4 مشاكل حقيقية تحتاج إصلاح**، **4 إنذارات كاذبة أو مبالغ فيها**، **4 ملاحظات تصميمية لا تحتاج تدخل عاجل**.

---

## إنذارات كاذبة (4 بنود)

### CRIT-12 — pg_cron في مخططين مختلفين -- **إنذار كاذب**
`CREATE EXTENSION IF NOT EXISTS` تتجاهل الأمر إذا كان الامتداد مُثبتاً. في Supabase Cloud، `pg_cron` مُثبت مسبقاً في `pg_catalog`. كل الأوامر اللاحقة no-op. أما `cron.schedule` فإنها تُحدِّث المهمة إذا كان الاسم موجوداً (upsert behavior). لا توجد مهام مكررة.

### HIGH-20 — paid_months بين السنوات -- **ملاحظة تصميمية وليست ثغرة**
`tenant_payments.paid_months` هو **عداد إجمالي تراكمي بتصميم مقصود** -- يمثل إجمالي ما دُفع من عقد واحد عبر كل فترته. `cron_check_late_payments` يحسب `expected_payments` نسبياً من بداية العقد حتى اليوم -- المقارنة صحيحة مع العداد التراكمي.

### HIGH-21 — notify_all_beneficiaries تفشل صامتة -- **مبالغ فيه**
`execute_distribution` تُستدعى دائماً من authenticated context (admin/accountant عبر الواجهة). `notify_all_beneficiaries` تتحقق من `has_role(auth.uid(), 'admin/accountant')` -- نفس المستدعي. لن تفشل إلا في حالة نظرية (service_role context) غير مستخدمة حالياً. الـ `EXCEPTION WHEN OTHERS THEN NULL` معالجة مقصودة لعدم كسر transaction التوزيع.

### MED-25 — sessionStorage chunk_retry -- **إنذار كاذب**
`sessionStorage.removeItem('chunk_retry')` يُنفَّذ عند تحميل `App.tsx` الناجح -- يعني أن الـ chunk الرئيسي حُمِّل بنجاح. الصفحات الفرعية تستخدم `lazyWithRetry` بشكل مستقل. لا توجد حلقة لا نهائية.

---

## مشاكل حقيقية تحتاج إصلاح (4 بنود)

### 1. CRIT-13 + HIGH-24 -- `contracts_safe` و `beneficiaries_safe` بـ `security_invoker = false` -- **مؤكَّد وخطير**

**التحقق:** آخر حالة للعروض:
- `beneficiaries_safe`: migration `20260314024401` (الأخير) أعاد إنشاءها بـ `security_invoker = false` -- **نحن أنفسنا فعلنا هذا في إصلاح MED-05!**
- `contracts_safe`: migration `20260313162017` يُعيِّنها بـ `security_invoker = false` ولم يتغير بعدها.

**الأثر:** كلا العرضين يتجاوزان RLS على الجداول الأصلية. أي `authenticated` يرى **جميع الصفوف** بغض النظر عن سياسات `is_fiscal_year_accessible` أو عزل المستفيدين.

**السبب التصميمي الأصلي:** المستفيد يحتاج رؤية أسماء جميع المستفيدين (لصفحة التوزيع)، والعقود العامة. لكن `security_invoker = false` يكشف أيضاً صفوف السنوات غير المنشورة.

**الإصلاح:** إعادة العروض لـ `security_invoker = true` مع إضافة سياسة RLS مناسبة على `beneficiaries` تسمح لكل `authenticated` بقراءة الأعمدة غير الحساسة (name, share_percentage) + تعديل `contracts` RLS لتسمح للمستفيدين/الواقف بالقراءة عبر `is_fiscal_year_accessible` فقط.

### 2. HIGH-22 -- validate_advance_request_amount على INSERT فقط -- **مؤكَّد**
**التحقق:** آخر تعريف للـ trigger في migration `20260301124911` هو `BEFORE INSERT` فقط. Migration `20260314023052` يُعيد تعريف الدالة لكن **لا يُعيد إنشاء الـ trigger**. أي `UPDATE` على `amount` يتجاوز التحقق.

**الإصلاح:** إعادة إنشاء الـ trigger بـ `BEFORE INSERT OR UPDATE`.

### 3. HIGH-23 -- close_fiscal_year لا تتحقق من تداخل السنوات -- **مؤكَّد جزئياً**
**التحقق:** Migration `20260314023741` (إصلاحنا السابق) يحتوي `close_fiscal_year` المُحدَّث لكنه **لا يتحقق من تداخل المدد** عند إنشاء السنة التالية. يعتمد على `enforce_single_active_fy` trigger الذي يُغلق السنة النشطة الأخرى -- لكن هذا لا يمنع تداخل التواريخ.

**الإصلاح:** إضافة فحص `EXISTS` قبل إنشاء السنة التالية.

### 4. MED-23 -- cron_check_contract_expiry يكشف tenant_name -- **مؤكَّد جزئياً**
**التحقق:** الكود الفعلي الحالي (من DB functions) يُرسل `ben_msg` (بدون tenant_name) للمستفيدين و`msg` (مع tenant_name) للأدمن. **لكن** migration القديم `20260225042354` كان يرسل `msg` (مع tenant_name) لجميع المستفيدين. Migration لاحق أصلح هذا. الحالة الحالية **آمنة**.

---

## ملاحظات تصميمية (4 بنود -- لا تحتاج تدخل عاجل)

| البند | التقييم |
|-------|---------|
| MED-21 -- سقف 12 لعقود monthly | العقود في النظام سنوية (12 شهر max). تصميم مقصود |
| MED-22 -- available_amount لا يُحفظ | يُحسب ديناميكياً من الأعمدة المحفوظة. لا خطأ |
| MED-24 -- DEFAULT PRIVILEGES | مقصود مع وجود event trigger `auto_revoke_anon_execute` كحماية إضافية |

---

## خطة الإصلاح

### Migration SQL واحد يشمل:

1. **CRIT-13 + HIGH-24**: إعادة إنشاء `beneficiaries_safe` و `contracts_safe` بـ `security_invoker = true` مع:
   - إضافة سياسة RLS على `beneficiaries` تسمح لـ `beneficiary`/`waqif` بقراءة الأسماء والنسب فقط (SELECT)
   - إضافة سياسة RLS على `contracts` تسمح لـ `beneficiary`/`waqif` بالقراءة عبر `is_fiscal_year_accessible` فقط

2. **HIGH-22**: إعادة إنشاء trigger `validate_advance_request_amount_trigger` بـ `BEFORE INSERT OR UPDATE`

3. **HIGH-23**: إضافة فحص تداخل التواريخ في `close_fiscal_year` قبل إنشاء السنة التالية

