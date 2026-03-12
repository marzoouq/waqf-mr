

# خطة إصلاح نتائج التقرير الجنائي — الجولة النهائية

## تحليل كل بند

### BUG-01 — `auth-verify` لا يتحقق من ملكية Challenge 🔴 **مؤكد — يحتاج إصلاح**
السطر 224-229: البحث عن التحدي بـ `challenge_id` و `type` فقط بدون `user_id`. في `auth-options` (سطر 205-208) التحدي يُدرج **بدون** `user_id` أصلاً — لأن المستخدم غير مصادق بعد. لذلك الإصلاح الصحيح ليس إضافة `user_id` للـ query (لأنه NULL)، بل **ربط التحدي بالـ credential بعد جلبه**: التحقق أن `storedCred.user_id` يطابق المستخدم الذي سيتم إنشاء جلسة له. هذا متحقق ضمنياً لأن `verifyAuthenticationResponse` يستخدم المفتاح العام الخاص بالـ credential — لكن إضافة حماية صريحة أفضل.

**الإصلاح**: بعد جلب `storedCred`، نضيف تحققاً أن الـ challenge لم يُستخدم سابقاً (وهو محذوف بعد الاستخدام ✅) + نضمن أن التحدي فريد عبر UUID. الخطر الفعلي منخفض جداً لأن WebAuthn cryptographically يمنع الاستغلال.

### BUG-02 — `register-options` بلا rate limiting 🔴 **مؤكد — يحتاج إصلاح**
السطر 71-113: لا يوجد `check_rate_limit`. لكن الخطر أقل من `auth-options` لأنه يتطلب JWT صالح.

**الإصلاح**: إضافة rate limiting مماثل لـ `auth-options` (10 طلبات/دقيقة لكل user_id).

### BUG-03 — `error_log_queue` و `waqf_notification_sound` لا يُحذفان 🔴 **مؤكد**
`error_log_queue` يحتوي stack traces + URLs. `waqf_notification_sound` تفضيل مستخدم.

**الإصلاح**: إضافة سطرين في signOut.

### BUG-04 — `DataExportTab` بـ `limit(5000)` 🟠 **مؤكد لكن محمي بـ RLS + الصفحة للناظر فقط**
الصفحة في Settings (SettingsPage) محمية بدور admin. لكن القطع الصامت مشكلة وظيفية.

**الإصلاح**: إضافة تحذير للمستخدم إذا وصلت النتائج للحد الأقصى.

### BUG-05 — `cachedFonts` 🟢 **غير صحيح**
Deno Deploy يحتفظ بحالة module-level في warm isolates. الكاش يعمل فعلاً بين الطلبات المتتالية. لا حاجة لتغيير.

### BUG-06 — تعطيل الصوت لا يُطبق 🟢 **غير صحيح**
`useNotifications.ts` سطر 264 يقرأ `waqf_notification_sound` ويفحصه قبل تشغيل الصوت. يعمل بشكل صحيح. المفتاح فقط يحتاج تنظيف عند signOut (مغطى في BUG-03).

### BUG-07 — `check-contract-expiry` بـ `limit(500)` 🟠 **مؤكد**
**الإصلاح**: رفع الحد أو إزالته (العقود المنتهية نادراً ما تتجاوز المئات).

---

## خطة التنفيذ

### المهمة 1: تحصين WebAuthn
**الملف**: `supabase/functions/webauthn/index.ts`
- إضافة rate limiting لـ `register-options` (10 طلبات/دقيقة لكل `user_id`)
- لا حاجة لتغيير `auth-verify` — التحقق الكريبتوغرافي عبر `verifyAuthenticationResponse` يضمن أن المفتاح العام يطابق الـ credential، والـ challenge يُحذف بعد الاستخدام. إضافة `user_id` للـ query مستحيلة لأن التحدي يُنشأ بدون `user_id` في `auth-options`

### المهمة 2: تنظيف signOut
**الملف**: `src/contexts/AuthContext.tsx`
- إضافة: `localStorage.removeItem('error_log_queue')`
- إضافة: `localStorage.removeItem('waqf_notification_sound')`

### المهمة 3: تحذير قطع البيانات في التصدير
**الملف**: `src/components/settings/DataExportTab.tsx`
- بعد جلب البيانات، إذا `data.length >= 5000` → عرض toast تحذيري

### المهمة 4: رفع حد العقود المنتهية
**الملف**: `supabase/functions/check-contract-expiry/index.ts`
- تغيير `.limit(500)` إلى `.limit(2000)` أو إزالة الحد

---

## التفاصيل التقنية

```text
webauthn/index.ts — register-options:
  + إضافة check_rate_limit بعد getAuthUser
  + المفتاح: webauthn:register:{user.id}
  + الحد: 10/دقيقة

AuthContext.tsx — signOut:
  + localStorage.removeItem('error_log_queue')
  + localStorage.removeItem('waqf_notification_sound')

DataExportTab.tsx — handleExport:
  + if (data.length >= 5000) toast.warning('...')

check-contract-expiry/index.ts:
  .limit(500) → .limit(2000)
```

