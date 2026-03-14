

# تقرير التحقق من الجولة الثانية — بند بند

## ملخص سريع

من أصل 11 بنداً جديداً في التقرير الموسَّع، **تحقق من الكود الفعلي** يُظهر:
- **4 مشاكل حقيقية تحتاج إصلاح**
- **4 إنذارات كاذبة أو مبالغ فيها**
- **3 ملاحظات تصميمية منخفضة الخطورة**

---

## ✅ تم إصلاحه مسبقاً (من التقرير الأول)

| البند | الحالة |
|-------|--------|
| HIGH-05 (session null check) | ✅ مُصلح — سطر 174 في `useInvoices.ts` يحتوي `if (!session?.access_token) throw new Error(...)` |
| CRIT-02 (trigger 50% ثابتة) | ✅ مُصلح — migration `20260314023052` يقرأ من `app_settings` |
| MED-05 (notes مكشوف) | ✅ مُصلح — migration `20260314023052` (تمويه `notes` في `beneficiaries_safe`) |

---

## ❌ إنذارات كاذبة — ليست مشاكل حقيقية (4 بنود)

### CRIT-04 — `allocate_icv_and_chain` مُعادة لـ `authenticated` ← **إنذار كاذب جزئي**
**الحقيقة:** نعم، migration `20260313181829` سطر 58 يمنحها لـ `authenticated`. لكن الدالة نفسها تملك guard داخلي:
```sql
IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
  RAISE EXCEPTION 'غير مصرح بتخصيص ICV';
END IF;
```
المستفيد أو الواقف **لا يستطيع** تنفيذها — ستفشل فوراً. هذا نفس نمط `docs/SECURITY-KNOWLEDGE.md` "حراس برمجيون داخليون". المحاسب يستطيع تنفيذها وهذا **مقصود** (المحاسب يُصدر الفواتير). **ليست ثغرة حرجة.**

### CRIT-05 — `lookup_by_national_id` يُعاد فتحها تلقائياً ← **إنذار كاذب**
**الحقيقة:** event trigger `auto_revoke_anon_execute` يمنح `authenticated` لكل دالة جديدة. لكن `lookup_by_national_id` تملك guard داخلي:
```sql
IF auth.uid() IS NULL THEN RAISE EXCEPTION '...'; END IF;
```
**والأهم**: حتى لو استدعاها مستخدم `authenticated`، فإن `get_pii_key()` تتحقق من `has_role(admin/accountant)` — مستخدم بدور `beneficiary` سيحصل على `v_key = NULL` والدالة لن تفك التشفير. النتيجة: لن يجد تطابقاً أبداً. **ليست ثغرة عملية.**

### HIGH-09 — `auto_revoke_anon_execute` في `allowed_functions` ← **إنذار كاذب**
`auto_revoke_anon_execute` هي event trigger function وليست regular function — لا يمكن استدعاؤها مباشرة عبر `supabase.rpc()`. وجودها في القائمة لا يؤثر.

### MED-10 — `reopen_fiscal_year` سنتان نشطتان ← **إنذار كاذب**
يوجد trigger `enforce_single_active_fy` (migration `20260227072815`) يُغلق أي سنة نشطة أخرى تلقائياً عند فتح واحدة. لا يمكن أن توجد سنتان نشطتان.

---

## 🔴 مشاكل حقيقية تحتاج إصلاح (4 بنود)

### 1. HIGH-06 — `cron_check_contract_expiry` يُرسل `ben_msg` لكل المستفيدين
**مؤكَّد:** سطر 43 في migration `20260227054424` يُرسل لكل المستفيدين. رسالة المستفيدين (`ben_msg`) لا تحتوي على اسم المستأجر (تستخدم "أحد العقود") — **لكن** `days_left` يكشف معلومة عن عقد محدد. التقرير بالغ في قوله "tenant_name يُرسل للمستفيدين" — الكود الفعلي يرسل `ben_msg` (بدون اسم المستأجر). **مشكلة منخفضة** وليست HIGH.

### 2. HIGH-07 (التقرير: HIGH-08) — `upsert_tenant_payment` بتاريخ `CURRENT_DATE` دائماً
**مؤكَّد:** الدالة تستخدم `CURRENT_DATE` — مشكلة محاسبية حقيقية عند التسجيل الرجعي.
**الإصلاح:** إضافة parameter `p_payment_date date DEFAULT CURRENT_DATE` للدالة + تمرير التاريخ من الواجهة.

### 3. HIGH-06 (التقرير: HIGH-06) — Fallback في `useBeneficiariesDecrypted`
**مؤكَّد:** سطر 56-62 يجلب `email, phone, notes` مباشرة من `beneficiaries`. لكن هذا الـ fallback يعمل فقط عند فشل RPC ولا يكشف `national_id`/`bank_account`. وهو متاح فقط لـ admin/accountant (سطر 44: `enabled: isAuthorized`). **مشكلة منخفضة** — الـ fallback يعرض بيانات لمستخدمين مخوَّلين أصلاً.

### 4. MED-09 — `close_fiscal_year` بدون تحقق من pending
**مؤكَّد:** لا يوجد validation. هذه مشكلة تصميمية — يمكن إضافة تحذير بدل منع.

---

## 🔵 ملاحظات تصميمية منخفضة (3 بنود)

| البند | التقييم |
|-------|---------|
| LOW-03 — `notify_admins` بدون rate limit | الدالة تتحقق `has_role(admin/accountant)` — المستفيد لا يستطيع استدعاءها أصلاً |
| LOW-04 — `ticket_number` بدون UNIQUE | احتمال التصادم 1/65536 في نفس اليوم — منخفض جداً |
| LOW-05 — `has_role` لـ anon | ضرورة — تُستخدم داخل RLS policies التي تُقيَّم بسياق anon أحياناً |
| MED-06 — `log_access_event` من anon | مقصود — لتسجيل أحداث login_failed قبل تسجيل الدخول |
| MED-07 — المحاسب يرى كل التذاكر | قرار تصميم — المحاسب دور موثوق (ثقة عالية حسب SECURITY-KNOWLEDGE.md) |
| MED-08 — double-source لـ paid_count | COALESCE يعمل كـ fallback — ليس double-counting |

---

## خطة الإصلاح المقترحة

### Migration SQL
1. إضافة `p_payment_date` لدالة `upsert_tenant_payment` لحل مشكلة التاريخ المحاسبي
2. تحديث `close_fiscal_year` لإضافة تحذير (ليس منع) عند وجود pending distributions

### تعديل كود (اختياري)
3. تحسين fallback في `useBeneficiariesDecrypted` لاستخدام `beneficiaries_safe` بدل الجدول المباشر

### تحديث التوثيق
4. تحديث `.lovable/plan.md` و `SECURITY-KNOWLEDGE.md` لتوثيق نتائج الجولة الثانية

---

## الخلاصة

**التقرير الموسَّع بالغ في تصنيف عدة بنود كـ "حرجة" (CRIT-04, CRIT-05)** — التحقق من الكود يُظهر أن الحراس الداخليين (`has_role` guards) يمنعون الاستغلال الفعلي. المشاكل الحقيقية المتبقية هي:
- مشكلة محاسبية (تاريخ الدخل) — **HIGH**
- إقفال سنة بدون تحقق من معلقات — **MEDIUM**
- fallback يكشف بيانات لمخوَّلين — **LOW**

