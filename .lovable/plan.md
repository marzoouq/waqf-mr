

# خطة إصلاح نتائج الفحص الجنائي الموسع

## تقييم النتائج (بعد التحقق المباشر من الكود)

### نتائج مُسقطة (ليست مشاكل حقيقية)

**CRIT-01 و CRIT-02** — `enforce_single_active_fy` و `prevent_issued_invoice_modification` بدون REVOKE صريح:
هذه دوال من نوع `RETURNS trigger` — لا يمكن استدعاؤها عبر `supabase.rpc()` من العميل. PostgreSQL يرفض استدعاء trigger functions مباشرة. الـ event trigger في migration `20260313193954` يمنح `authenticated` EXECUTE على كل الدوال، لكن هذا لا يُشكّل خطراً لأن trigger functions غير قابلة للاستدعاء المباشر. **ليست ثغرة**.

**HIGH-03** — بيانات مالية تُرسل لـ AI gateway:
التحقق أثبت أن البيانات التفصيلية تُرسل فقط للـ admin (سطر 242: `if (isAdmin)`). المستفيدون يرون ملخصاً عاماً فقط. هذا قرار تصميمي وليس ثغرة أمنية. يبقى كملاحظة compliance للمراجعة.

---

### نتائج تحتاج إصلاح فعلي

#### 1. CRIT-03 — `get_next_icv` مكشوفة لكل authenticated (مرتفعة)
الدالة تُرجع `integer` (ليست trigger) ويمكن لأي مستخدم authenticated استدعاؤها عبر RPC. لا يوجد فحص دور داخلها. تكشف رقم ICV التالي لكل المستخدمين.

**الإصلاح**: إضافة guard داخلي يتحقق من دور admin/accountant — نفس نمط `allocate_icv_and_chain`.

#### 2. HIGH-01 — race condition في `auto-version.yml` (متوسطة)
لا يوجد `concurrency` key. push-ان متزامنان سيقرآن نفس الإصدار.

**الإصلاح**: إضافة `concurrency: { group: auto-version, cancel-in-progress: false }`.

#### 3. HIGH-02 — `remaining` off-by-one في `lookup-national-id` (منخفضة)
القراءة تحدث قبل `check_rate_limit` ثم يُضاف 1 يدوياً. العدد المعروض قد يكون غير دقيق بمقدار 1. التحديد الفعلي للمعدل صحيح.

**الإصلاح**: حساب `remaining` بعد `check_rate_limit` مباشرة بدلاً من القراءة المسبقة.

#### 4. MED-02 — heredoc injection في `changelog.yml` (منخفضة)
`github.event.release.body` يُدرج في heredoc بدون حماية.

**الإصلاح**: استبدال heredoc بكتابة عبر environment variable.

---

## التغييرات المطلوبة

### ملف 1: Migration SQL جديد
- `CREATE OR REPLACE FUNCTION get_next_icv()` مع إضافة guard:
  ```sql
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  ```
- `REVOKE EXECUTE ON FUNCTION get_next_icv() FROM PUBLIC, anon`
- `GRANT EXECUTE ON FUNCTION get_next_icv() TO authenticated, service_role`

### ملف 2: `.github/workflows/auto-version.yml`
- إضافة `concurrency` block بعد `permissions`

### ملف 3: `supabase/functions/lookup-national-id/index.ts`
- نقل حساب `remaining` ليعتمد على إعادة قراءة العداد بعد `check_rate_limit`، أو حسابه من `RATE_LIMIT - 1` عند أول طلب ناجح

### ملف 4: `.github/workflows/changelog.yml`
- استبدال heredoc بـ `echo "$BODY" > /tmp/release_notes.md` عبر environment variable محمية

