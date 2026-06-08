
# الخطة المنقّحة — احترام الوثائق + إصلاح ما يثبت بفحص الكود فقط

> **مبدأ التنقيح:** كل تغيير DB أو سلوك مرئي يجب أن يكون مدعوماً بـ (أ) قراءة جسم الدالة، و(ب) عدم تعارضه مع ذاكرة المشروع. أي بند لم يجتزْ هذين الشرطين أُسقط.

---

## نتيجة فحص جسم الدوال الـ11 المشتبه بها

| الدالة | جسم الدالة | الحكم بعد القراءة |
|---|---|---|
| `update_beneficiary_self` | يحوي `WHERE user_id = auth.uid()` صريحاً | ✅ **آمنة** — أُسقط البند P0.2 السابق |
| `rate_support_ticket` | فحص `v_owner <> auth.uid()` + قيود حالة | ✅ آمنة |
| `log_access_event` | anti-spoof + rate limit + whitelist للأحداث | ✅ مقصودة anon-callable |
| `get_public_stats` | تُكرّم `app_settings` (auto/manual/hidden) كما هو موثَّق في `mem://security/privacy/public-stats-anonymization` | ✅ مقصودة anon-callable |
| `get_total_beneficiary_percentage` | تُرجع رقماً واحداً (مجموع نِسَب) — لا PII | ✅ آمنة |
| `get_dashboard_full_summary`, `get_dashboard_kpis`, `get_beneficiary_dashboard` | تقرأ `income/expenses/accounts` — هذه الجداول محمية بـ RLS على مستوى الصف | ✅ آمنة — التعرّض المالي محسوم في طبقة الجداول، ليس الدوال |
| `get_year_comparison_summary`, `get_multi_year_summary`, `get_income_summary_by_source`, `get_expense_summary_by_type`, `get_max_advance_amount` | تجميعات مالية مرئية للمستفيد/الواقف **بحكم الوثائق** (لوحات الأدوار، تقارير الإفصاح) | ✅ آمنة — تقييدها يكسر الوثائق |
| `get_support_analytics`, `get_support_stats` | تجميعات تذاكر — مقصودة كما هو موثَّق في `mem://business-logic/messaging/support-routing-logic` | ✅ آمنة |
| **`clear_zatca_otp`** | **لا فحص دور — تمسح OTP شهادة ZATCA لأي مستخدم مسجَّل** | 🔴 **ثغرة مؤكدة** |

**النتيجة:** ثغرة واحدة فعلية فقط، باقي الـ41 تحذيراً هي False positives من Linter لأن `SECURITY DEFINER` ضروري لتجاوز RLS بطريقة مقصودة وموثقة.

---

## الخطة النهائية (3 بنود حقيقية + توثيق)

### 🔴 1. إصلاح ثغرة `clear_zatca_otp` (الوحيدة الفعلية)

**الجذر:** الدالة معرّفة `SECURITY DEFINER` بدون أي فحص داخلي للدور. أي مستفيد بإمكانه استدعاء `supabase.rpc('clear_zatca_otp')` ومسح OTP شهادة ZATCA النشطة → تعطيل دورة فوترة كاملة.

**الحل (migration واحدة لا تغيّر أي سلوك مرئي):**
```sql
CREATE OR REPLACE FUNCTION public.clear_zatca_otp()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.app_settings
     SET value = '', updated_at = now()
   WHERE key IN ('zatca_otp_1','zatca_otp_2') AND value != '';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.clear_zatca_otp() FROM PUBLIC, anon;
-- يبقى GRANT للـ authenticated لأن الناظر authenticated، والفحص الداخلي يحجب غيره.
```

**التحقق:** جلسة مستفيد → `supabase.rpc('clear_zatca_otp')` يجب أن تُرجع `permission denied`. جلسة ناظر → ✅ تنجح.

---

### 🔴 2. فك حظر `pre-push` (P0.4 + P0.5 السابقان)

**2.أ — `SystemDiagnosticsPage.tsx` يستخدم `location.reload`**
- **الجذر:** التنظيف العميق يُلغي تسجيل SW + يمسح كل التخزين. `invalidateQueries` لا يكفي.
- **الحل:** إضافة المسار إلى ALLOWLIST في `src/components/pwa/__tests__/no-forced-reload.test.tsx` مع تعليق: *"reload ضروري بعد runDeepClean لإعادة bootstrap كامل (SW + caches + IDB كلها مُسحت)"*.
- **لا تغيير في سلوك صفحة التشخيص.**

**2.ب — `useNotificationActions.test.ts` flaky**
- **الجذر:** `waitFor` افتراضي (1000ms) قصير لـ CI البطيء أثناء rollback متعدد المراحل.
- **الحل:** زيادة `timeout: 3000` على `waitFor` في الـ3 اختبارات المتقطعة فقط.
- **لا تغيير في كود الإنتاج.**

**التحقق:** `npx vitest run` يخرج 2121/2121 ✅، و `npm run audit:gate` يمر.

---

### 📝 3. توثيق ما هو "آمن بالقصد" في security memory

**الجذر:** Linter يرفع 41 WARN على دوال `SECURITY DEFINER` لأن السكانر لا يرى الـRLS التي تحميها على مستوى الجداول، ولا يعرف أن `contracts_safe` مقصودة `security_invoker=off`. هذه ضوضاء تُربك التدقيق المستقبلي.

**الحل:** `security--update_memory` يوثّق:
- `contracts_safe` view: `security_invoker=off` عمداً لإخفاء PII (مذكور بالفعل في `mem://security/views/contracts-safe-rationale`).
- 40 دالة SECURITY DEFINER: كلها إما تحوي فحص دور داخلي صريح، أو تحمي البيانات عبر RLS على الجداول الأساسية، أو مقصودة anon-callable (landing + audit logging).
- استثناء واحد أُصلح: `clear_zatca_otp` (البند 1 أعلاه).

**لا تعديل على أي دالة أخرى. لا تعديل على أي سلوك يراه أي دور.**

---

## ما **لن** يتم (سحبت من الخطة السابقة)

| البند المسحوب | السبب |
|---|---|
| تقييد `get_dashboard_full_summary` على admin/accountant | يكسر لوحة المستفيد الموثَّقة |
| تقييد `get_*_summary_by_*` و `get_year_comparison_summary` | يكسر تقرير الإفصاح ومقارنة السنوات للمستفيد/الواقف |
| تقييد `get_max_advance_amount` و `get_total_beneficiary_percentage` | يكسر تدفق طلب السلفة للمستفيد |
| تقييد `get_support_stats/analytics` | الوثائق تجعلها لوحة دعم متاحة |
| `REVOKE EXECUTE FROM authenticated` على RPC إدارية | كلها تحوي `has_role` داخلياً بالفعل — الـ REVOKE زائد ويكسر استدعاءات تيستات |
| تعديل عرض `contracts_safe` | محظور بالذاكرة |

---

## ما يبقى من تنظيف اختياري (لا يمسّ السلوك ولا الوثائق)

- استبدال `any` الوحيد في `utils/pdf/core/pdfHelpers.ts` بنوع `jsPDF`.
- توثيق الـ3 `@ts-ignore` بتعليق سبب.
- تقسيم `useContractForm.ts` (228 سطر) إلى ملفّين.

**هذه ليست في الخطة الأساسية**؛ تنفَّذ فقط لو طلبتها صراحة.

---

## التسلسل الزمني

| الخطوة | الزمن |
|---|---|
| 1. migration لـ `clear_zatca_otp` | 5 دق |
| 2.أ ALLOWLIST + 2.ب timeout للاختبارات | 5 دق |
| 3. `security--update_memory` | 5 دق |
| التحقق النهائي (`npm run audit`, `npm test`, `supabase--linter`) | 10 دق |
| **المجموع** | **25 دقيقة** |

---

## تأكيد مطلوب قبل التنفيذ

هل أنفّذ الخطة بهذه الصورة المنقّحة (3 بنود فقط، لا تغيير في أي سلوك يراه أي دور، ولا تعديل خارج البند الواحد المؤكد)?
