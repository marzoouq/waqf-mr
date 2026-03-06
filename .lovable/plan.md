

# خطة إصلاح الجولة الثامنة — بعد التحقق من الـ DB الحي

## نتائج التحقق

| المشكلة | الحقيقة من DB الحي |
|---|---|
| #C-1 — access_log "Anyone can insert" | **ملغاة** — السياسة الحالية هي `"No direct inserts on access_log" WITH CHECK(false)`. مُصلحة فعلاً |
| #C-3 — إشعارات قديمة تحتوي tenant_name | **ملغاة** — 0 إشعارات مطابقة في DB الحي |
| #C-4 — beneficiaries_safe security_invoker=false | **ملغاة** — DB الحي يُظهر `security_invoker=on`. الحالة الآمنة مُطبقة |
| #C-5 — RLS الأصلية "Authenticated users can view USING(true)" | **ملغاة** — لا توجد أي سياسة بهذا الاسم في DB الحي. تم حذفها في migrations لاحقة |
| #H-7 — is_fiscal_year_accessible NULL→true | **ملغاة** — مُصلحة (المستخدم أكد ذلك سابقاً) |
| #M-7 — get_pii_key STABLE | **ملغاة** — التقرير نفسه أكد أنه لا مشكلة |
| #M-8 — useAppSettings cache pii_key | **ملغاة** — RLS تمنع الوصول أصلاً |

## مشاكل حقيقية مؤكدة (3 إصلاحات)

---

### 1. execute_distribution — GRANT TO authenticated
**DB الحي:** `has_function_privilege('authenticated', 'execute_distribution(...)') = true`

الدالة تحتوي guard داخلي (`has_role admin/accountant`) لكن الأفضل أمنياً سحب الصلاحية من authenticated. الاستدعاء الوحيد من الكود هو `useDistribute.ts` الذي يستدعيها عبر `supabase.rpc()` — المستخدمون المصرح لهم (admin/accountant) سيستمرون بالعمل لأن الـ guard الداخلي يتحقق.

**المشكلة:** سحب EXECUTE من authenticated سيمنع حتى الـ admin من استدعائها عبر `supabase.rpc()` لأن anon key يستخدم دور authenticated. الـ guard الداخلي كافٍ فعلاً.

**القرار:** لا تغيير — الـ guard الداخلي يحمي الدالة. سحب EXECUTE سيكسر الوظيفة للأدمن.

---

### 2. ai-assistant — استعلامات income/expenses بدون `.limit()`
**الكود الحي (سطور 313-336):** لا يوجد `.limit()` على استعلامات income و expenses.

**الإصلاح:** إضافة `.limit(100)` على كلا الاستعلامين لمنع إرسال بيانات ضخمة للـ AI API.

```typescript
// income query — سطر 317:
.order("date", { ascending: false })
.limit(100);

// expenses query — سطر 336:
.eq("fiscal_year_id", activeFY.id)
.limit(100);
```

---

### 3. rate_limits — 15 سجل حالياً، ينمو بلا حدود
**DB الحي:** 15 سجل حالياً. ليس مُلحّاً لكن يحتاج تنظيف دوري.

**الإصلاح:** لا يمكن إضافة cron عبر migration (يحتاج بيانات خاصة بالمشروع). سنضيف تنظيف داخل دالة `check_rate_limit` نفسها — كل 100 استدعاء، ينظف السجلات القديمة.

**الإصلاح البديل الأبسط:** إضافة حذف تلقائي داخل `check_rate_limit`:
```sql
-- في بداية الدالة، تنظيف عشوائي (1% من الاستدعاءات):
IF random() < 0.01 THEN
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
END IF;
```

---

## ملخص التغييرات النهائية

| النوع | التغيير |
|---|---|
| Edge Function | ai-assistant: إضافة `.limit(100)` لاستعلامات income و expenses |
| مهاجرة DB | تحديث `check_rate_limit` بتنظيف عشوائي للسجلات القديمة |

تعديل واحد في Edge Function + مهاجرة DB واحدة. لا تغييرات في الكود الأمامي.

