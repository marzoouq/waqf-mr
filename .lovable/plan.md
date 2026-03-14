

# تقرير التحقق من البنود — ما تم تنفيذه وما المتبقي

## ملخص سريع

من أصل 13 بنداً في التقرير الجنائي، **4 تم إصلاحها بالفعل**، **4 كانت إنذارات كاذبة (ليست مشاكل حقيقية)**، و**5 مشاكل حقيقية لم تُعالج بعد**.

---

## ✅ تم إصلاحه بالفعل (4 بنود)

| البند | الإصلاح | التأكيد |
|-------|---------|---------|
| **HIGH-01** — race condition في `auto-version.yml` | ✅ أُضيف `concurrency: group: auto-version` (سطر 15-17) | مؤكَّد بالكود |
| **HIGH-02** — double-counting في `lookup-national-id` | ✅ أُعيد حساب `remaining` بعد `check_rate_limit` عبر re-read (سطر 84-89) | مؤكَّد بالكود |
| **MED-04** (changelog heredoc) | ✅ استُبدل بـ `printf '%s\n' "$RELEASE_BODY"` عبر env variable (سطر 30) | مؤكَّد بالكود |
| **MED-03** (access_log INSERT مفتوح) | ✅ أُصلح مسبقاً في migration `20260220032221` — السياسة الآن `WITH CHECK (false)` | مؤكَّد بالكود والـ schema |

---

## ❌ إنذارات كاذبة — ليست مشاكل (4 بنود)

| البند | السبب |
|-------|-------|
| **CRIT-03** (getSession في WebAuthn) | `getSession()` في client-side **مقبول** — يُستخدم فقط لجلب `user_id` للاستعلام، والـ RLS تحمي البيانات server-side. الـ Edge Function نفسها تستخدم `getUser()` ✅ |
| **HIGH-04** (ai-assistant يستخدم serviceClient) | هذا **مقصود** — الدالة تتحقق أولاً بـ `getUser()` ثم تحدد الدور عبر `serviceClient`، ثم تُصفّي البيانات حسب `isAdmin`. لا يوجد تسريب للمستخدم |
| **MED-01** (waqf_bylaws `TO public`) | السياسة تستخدم `has_role()` داخل `USING` مما يمنع `anon` من القراءة فعلياً (لأن `auth.uid()` = NULL لـ anon) — `TO public` هنا آمن لأن الحراسة في `USING` |
| **MED-02** (trigger على INSERT فقط بدون UPDATE) | يوجد trigger منفصل `validate_advance_status_transition` على `BEFORE UPDATE` (migration `20260312034113`) يمنع الانتقالات غير المشروعة. وسياسة RLS تمنع المستفيدين من UPDATE أصلاً — فقط admin/accountant يستطيعون |

---

## 🔴 مشاكل حقيقية لم تُعالج بعد (5 بنود)

### 1. CRIT-01 — `beneficiaries_safe` و `contracts_safe` بـ `security_invoker = false` (حرجة)

**الحالة**: آخر migration (`20260313162017`) يُعيد الـ views إلى `security_invoker = false`. هذا يعني:
- أي `beneficiary` يرى **جميع** المستفيدين (أسماء + نسب + ملاحظات) لا فقط بياناته
- أي `beneficiary` يرى **جميع** العقود

**ملاحظة مهمة**: هذا قد يكون **تصميم مقصود** — المستفيدون يحتاجون رؤية أسماء ونسب جميع المستفيدين الآخرين للشفافية. البيانات الحساسة (هوية، حساب بنكي) مُموَّهة بـ CASE WHEN. لكن:
- حقل `notes` مكشوف بالكامل (قد يحتوي ملاحظات شخصية)
- يجب توثيق هذا كقرار تصميم واعٍ وليس "إنذار كاذب"

**الإصلاح المطلوب**: إما `security_invoker = true` مع تعديل RLS، أو إبقاء التصميم الحالي مع تمويه `notes` لغير admin/accountant.

### 2. CRIT-02 — تناقض بين trigger (50% ثابتة) و RPC (من app_settings)

**الحالة**: الـ trigger `validate_advance_request_amount` يستخدم `0.5` ثابتة (سطر 64):
```sql
v_max_advance := GREATEST(0, (v_estimated_share * 0.5) - v_paid_advances);
```
بينما `get_max_advance_amount` RPC يقرأ النسبة من `app_settings['advance_max_percentage']`.

**التأثير**: إذا غيّر الناظر النسبة في الإعدادات إلى 30%، الـ UI يعرض الحد الجديد لكن الـ trigger يسمح بـ 50%.

### 3. HIGH-03 — `contracts_safe` بدون فائدة من `security_barrier` مع `security_invoker=false`

مرتبط بـ CRIT-01. إذا أُصلح CRIT-01 يُحل تلقائياً.

### 4. HIGH-05 — `session?.access_token` قد يكون undefined في `useInvoices.ts`

**الحالة**: سطر 173-175:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
  headers: { Authorization: `Bearer ${session?.access_token}` },
```
إذا انتهت الجلسة، يُرسل `Bearer undefined` — والمستخدم يرى خطأ غير مفهوم.

### 5. MED-05 — `notes` في `beneficiaries_safe` مكشوف بدون تمويه

مرتبط بـ CRIT-01. حقل `notes` يظهر لجميع المستخدمين بدون CASE WHEN.

---

## خطة الإصلاح المقترحة

### Migration SQL جديد
1. تمويه `notes` في `beneficiaries_safe` لغير admin/accountant
2. مزامنة trigger `validate_advance_request_amount` مع `app_settings['advance_max_percentage']`

### تعديلات كود
3. إضافة null check في `useInvoices.ts` قبل إرسال الـ token

### قرار مطلوب منك
- **CRIT-01**: هل تريد تغيير `security_invoker` إلى `true` (المستفيد يرى بياناته فقط)؟ أم الإبقاء على التصميم الحالي مع تمويه `notes` فقط؟

