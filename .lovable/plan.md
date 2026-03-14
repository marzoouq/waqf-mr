

# تحقق من بنود الجولة الرابعة — بند بند

## ملخص سريع

من 16 بنداً: **3 مشاكل حقيقية تحتاج إصلاح**، **8 إنذارات كاذبة**، **5 ملاحظات تصميمية لا تحتاج تدخل عاجل**.

---

## ❌ إنذارات كاذبة (8 بنود)

### CRIT-10 — ZATCA placeholder في الإنتاج ← **إنذار كاذب**
الكود يعمل فقط عند `action === "onboard"` (استدعاء يدوي من الناظر) **و** `!ZATCA_API_URL`. هذا **أداة تطوير مقصودة** — الرسالة تقول صراحة "Development certificate created. Configure ZATCA_API_URL for production". في الإنتاج، `ZATCA_API_URL` مُعدّ. إذا لم يكن مُعداً، أي عملية غير `onboard` تُرجع خطأ 400. لا يمكن أن تُوقَّع فواتير بالشهادة الوهمية إلا إذا الناظر تعمّد ذلك.

### CRIT-11 — AI prompt بدون حد حجم ← **مبالغ فيه**
البيانات تُجلب عبر `userClient` (RLS مُطبَّق) — المستفيد يرى فقط بياناته المسموحة. حقن prompt نظري — بيانات DB مُدخلة من admin/accountant الموثوقين. التكلفة محدودة بـ rate limit (5 طلبات/60 ثانية).

### HIGH-16 — `generate_contract_invoices` من beneficiary ← **إنذار كاذب**
الدالة تملك guard داخلي `has_role(admin/accountant)` — ستفشل فوراً. استهلاك الموارد لفحص دور واحد لا يُذكر.

### HIGH-17 — WebAuthn يُرسل Magic Link بريد ← **إنذار كاذب**
`admin.auth.admin.generateLink()` **لا يُرسل بريداً** — هذا API الـ admin الذي يُنشئ الرابط فقط بدون إرسال. الإرسال يحصل فقط مع `signInWithOtp()`. مُوثَّق في Supabase docs.

### HIGH-18 — CORS يُعلن PUT/DELETE ← **مبالغ فيه**
المتصفح يُرسل preflight ويحصل على إذن — لكن الـ functions تتجاهل أي method غير POST/GET. لا يوجد handler لـ PUT/DELETE. سطح الهجوم صفر عملياً.

### HIGH-19 — Stored Prompt Injection ← **مبالغ فيه**
البيانات في DB مُدخلة حصرياً من admin/accountant عبر واجهات مُصادق عليها. لا يوجد مدخل خارجي غير موثوق. هذا خطر نظري لا عملي.

### MED-19 — `check_rate_limit` معكوس ← **إنذار كاذب — الكود صحيح**
تحققت من كود الدالة (migration `20260306091729`):
```sql
-- سطر 39: RETURN (v_count + 1) > p_limit;
```
`true` = **تجاوز الحد** (محجوب). `false` = مسموح.
`generate-invoice-pdf` يكتب `if (rateLimited === true) → 429` — **صحيح تماماً**.

### LOW-11 — heredoc injection في changelog.yml ← **إنذار كاذب**
الكود الفعلي (سطر 30) يستخدم `printf '%s\n' "$RELEASE_BODY"` عبر env variable — **ليس heredoc**. هذا تم إصلاحه في الجولة الأولى (MED-04).

---

## 🔴 مشاكل حقيقية (3 بنود)

### 1. CRIT-09 — `tenant_payments` RLS: beneficiary/waqif يرون كل الدفعات ← **مؤكَّد**
السياسة الحالية (من schema المقدَّم):
```
"Authorized roles can view tenant_payments" SELECT
USING (has_role(admin) OR has_role(beneficiary) OR has_role(waqif))
```
نفس مشكلة CRIT-08 — بيانات مالية خاصة بمستأجرين مكشوفة لكل المستفيدين.
**الإصلاح:** حذف `beneficiary`/`waqif` من السياسة — فقط admin/accountant يرون `tenant_payments`.

### 2. HIGH-15 — تقليل `paid_months` لا يحذف income ← **مؤكَّد**
عند تصحيح خطأ إدخال (تقليل عدد الدفعات)، سجلات `income` المُنشأة تلقائياً تبقى — تضخيم إيرادات.
**الإصلاح:** إضافة منطق عند `v_diff < 0` لحذف آخر `|v_diff|` سجلات income مرتبطة بالعقد.

### 3. MED-20 — `p_paid_months` بدون حد أقصى ← **مؤكَّد**
`paid_months = 999` يُنشئ 999 سجل income. مرتبط بـ HIGH-15.
**الإصلاح:** إضافة validation: `IF p_paid_months < 0 OR p_paid_months > contract.payment_count THEN RAISE EXCEPTION`.

---

## 🟡 ملاحظات تصميمية (5 بنود — لا تحتاج تدخل عاجل)

| البند | التقييم |
|-------|---------|
| MED-16 — auto-version race | حافة نادرة في CI — ليست ثغرة أمنية |
| MED-17 — audit log search محدود | تحسين UX — ليس ثغرة |
| MED-18 — zakat/vat stale | يُحل عند الحفظ — ليس خطأ محاسبي دائم |
| LOW-10 — تناقض توثيق | ملاحظة توثيقية |
| LOW-12 — tag يُشغّل changelog | حافة CI نادرة |

---

## خطة الإصلاح

### Migration SQL
1. **CRIT-09**: تحديث سياسة `tenant_payments` SELECT — حذف `beneficiary`/`waqif`، إبقاء admin/accountant فقط
2. **HIGH-15 + MED-20**: تحديث `upsert_tenant_payment`:
   - إضافة validation: `p_paid_months >= 0` و `<= payment_count`
   - عند `v_diff < 0`: حذف آخر `|v_diff|` سجلات income مرتبطة بالعقد (بنفس نمط `notes LIKE 'تحصيل تلقائي%'` + `contract_id` + `ORDER BY created_at DESC LIMIT |v_diff|`)

### تحديث كود
3. تحديث `useTenantPayments.ts` لإزالة استعلام `tenant_payments` من beneficiary/waqif context (إن وُجد)

