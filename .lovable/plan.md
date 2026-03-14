

# تحقق من بنود الجولة السادسة

## ملخص

من 11 بنداً: **2 مشكلتان حرجتان حقيقيتان**، **1 عالية مؤكدة**، **3 إنذارات كاذبة**، **5 ملاحظات تصميمية**.

---

## إنذارات كاذبة

**HIGH-26 (Timing Oracle):** الرد 429 لا يكشف وجود الهوية — يكشف فقط حالة Rate Limit. لا فائدة للمهاجم من التمييز الزمني بين "محدود" و"غير محدود".

**HIGH-27 (TOCTOU في useSendMessage):** تغيير `participant_id` أثناء إرسال رسالة يتطلب عملية admin متزامنة — سيناريو نظري بحت. الإشعار الخاطئ لا يكشف بيانات حساسة.

**MED-29 (stack trace في access_log):** سبق مناقشته في الجولة الثالثة (HIGH-12) — access_log محمي بـ RLS لـ admin فقط. أدوار موثوقة.

---

## مشاكل حقيقية

### 1. CRIT-14 — `lookup_by_national_id` معطلة كلياً ← مؤكَّد وحرج

الفحص `IF auth.uid() IS NULL THEN RAISE EXCEPTION` يمنع الدالة من العمل عند استدعائها من Edge Function عبر `serviceRoleKey` (لأن `auth.uid()` تُرجع NULL مع service_role). **ميزة تسجيل الدخول بالهوية الوطنية مكسورة**.

### 2. CRIT-15 — Event Trigger يُعيد منح EXECUTE لـ authenticated ← مؤكَّد

Migration `20260313194456` يُعيد إنشاء `lookup_by_national_id` بـ `CREATE OR REPLACE` → يُفعِّل event trigger `auto_revoke_anon_execute` → يمنح `EXECUTE TO authenticated` تلقائياً. أي مستخدم مسجل يستطيع استدعاء الدالة مباشرة متجاوزاً Rate Limiting في Edge Function.

### 3. HIGH-25 — Race condition في check_rate_limit ← مؤكَّد جزئياً

عندما `NOT FOUND` (سجل جديد)، الدالة تُدرج وتُرجع `false` (غير محدود) بدون تحقق من الحد. طلبان متزامنان لمفتاح جديد كلاهما يمرّان. لكن بعد الإدراج الأول، `SELECT FOR UPDATE` يقفل الصف. الخطر محدود بالطلب الأول فقط.

---

## ملاحظات تصميمية (لا تحتاج تدخل عاجل)

| البند | التقييم |
|-------|---------|
| HIGH-28 — Google Fonts في print | يُبطئ الطباعة offline لكن لا يكسر الوظيفة الأساسية. الخطوط Amiri موجودة محلياً في `public/fonts/` |
| MED-26 — Full table scan | مقبول حالياً مع عدد مستفيدين صغير |
| MED-27 — accountant لا يرى محادثات | قرار تصميم — المحاسب ليس طرفاً في المراسلات |
| MED-28 — لا pagination للرسائل | تحسين UX مستقبلي |
| MED-30 — ALTER FUNCTION يُفعِّل trigger | يُحل ضمن إصلاح CRIT-15 |

---

## خطة الإصلاح

### Migration SQL واحد:

1. **CRIT-14:** إزالة فحص `auth.uid() IS NULL` من `lookup_by_national_id` — الحماية عبر REVOKE (الدالة مصممة لـ service_role فقط)

2. **CRIT-15 + MED-30:** تحديث `auto_revoke_anon_execute` لإضافة قائمة استثناء `service_role_only_functions` تشمل:
   - `lookup_by_national_id`
   - `get_pii_key`
   - `decrypt_pii`
   - `get_active_zatca_certificate`
   
   هذه الدوال لا تحصل على `GRANT EXECUTE TO authenticated` عند إعادة إنشائها. ثم `REVOKE EXECUTE ON lookup_by_national_id FROM authenticated` صريحاً.

3. **HIGH-25:** تحديث `check_rate_limit` — عند `NOT FOUND`، بعد الإدراج، إعادة قراءة العداد والتحقق من الحد قبل إرجاع النتيجة.

