

# خطة إصلاح المشاكل المتبقية (5 إصلاحات في 6 ملفات)

بعد الفحص الجنائي المباشر للكود الحالي (بعد آخر تعديلات)، إليك الوضع الحقيقي:

---

## ما تم إصلاحه بالفعل (لا يحتاج تدخل)

| الملاحظة | الحالة |
|----------|--------|
| `ProtectedRoute.tsx` يستورد supabase مباشرة | مُصلح -- يستخدم `signOut()` من AuthContext |
| `useIdleTimeout` يعيد تسجيل listeners | مُصلح -- `onIdleRef` مستخدم |
| `FiscalYearContext` initializer و handleSet بدون try/catch | مُصلح جزئياً (تبقى سطر واحد) |

---

## المشاكل المتبقية الحقيقية

### 1. نوع الإشعار `'payment'` غير صالح -- الإشعارات تفشل صامتاً (4 مواقع)

**الخطورة: عالية -- وظيفي معطّل**

دالة `notify_all_beneficiaries` في قاعدة البيانات تقبل فقط: `info | warning | error | success`. القيمة `'payment'` تتسبب في `RAISE EXCEPTION` مما يعني أن الإشعار لا يُرسل أبداً.

**المواقع المتأثرة:**
- `src/hooks/useIncome.ts` السطر 23: `'payment'`
- `src/hooks/useExpenses.ts` السطر 23: `'payment'`
- `src/pages/dashboard/AccountsPage.tsx` السطر 282: `'payment'`
- `src/pages/dashboard/AccountsPage.tsx` السطر 289: `'payment'`

**اكتشاف إضافي:** `src/hooks/useMessaging.ts` السطر 102 يستخدم `'message'` كنوع -- هذا لا يفشل لأن `notifyUser` يكتب مباشرة في الجدول (بدون RPC validation)، لكنه غير متسق مع الأنواع المعرّفة.

**الإصلاح:** تغيير `'payment'` إلى `'info'` في المواقع الأربعة، و`'message'` إلى `'info'` في useMessaging.

### 2. `Auth.tsx` السطر 287 -- `supabase.auth.signOut()` مباشرة

**الخطورة: متوسطة -- معماري**

زر تسجيل الخروج عند فشل جلب الدور (roleWaitTimeout) يستدعي `supabase.auth.signOut()` مباشرة بدلاً من `signOut()` من `useAuth()`. هذا يترك حالة `role` في AuthContext غير متزامنة.

**الإصلاح:** استبدال `await supabase.auth.signOut()` بـ `await signOut()` (المستورد بالفعل في السطر 27).

### 3. `useMessaging.ts` السطر 29 -- قناة Realtime ثابتة

**الخطورة: منخفضة -- أداء**

كل المستخدمين يشتركون في نفس القناة `'conversations-realtime'` بدون فلترة. كل تغيير في أي محادثة يُرسل لكل المستخدمين المتصلين ويتسبب في invalidation غير ضروري.

**الإصلاح:** تغيير اسم القناة إلى `` `conversations-${user.id}` ``.

### 4. `FiscalYearContext.tsx` السطر 35 -- `localStorage.removeItem` بدون try/catch

**الخطورة: منخفضة -- دفاعي**

الاستدعاء داخل `useEffect` (التحقق من صحة القيمة المخزنة) لا يزال بدون حماية رغم أن `handleSetFiscalYearId` تم لفّه.

**الإصلاح:** لف السطر 35 بـ try/catch.

### 5. `admin-manage-users` -- `delete_user` بدون `validateUuid`

**الخطورة: منخفضة -- أمني**

جميع العمليات الأخرى (`update_email`, `update_password`, `confirm_email`, `set_role`) تتحقق من UUID باستخدام `validateUuid(userId)`. `delete_user` تتحقق فقط من `!userId` بدون التحقق من صحة الصيغة.

**الإصلاح:** إضافة `validateUuid(userId)` في حالة `delete_user`.

---

## ملخص التغييرات

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `src/hooks/useIncome.ts` | `'payment'` -> `'info'` (سطر 23) |
| 2 | `src/hooks/useExpenses.ts` | `'payment'` -> `'info'` (سطر 23) |
| 3 | `src/pages/dashboard/AccountsPage.tsx` | `'payment'` -> `'info'` (سطران: 282 و 289) |
| 4 | `src/hooks/useMessaging.ts` | `'message'` -> `'info'` (سطر 102) + قناة Realtime فريدة (سطر 29) |
| 5 | `src/pages/Auth.tsx` | `supabase.auth.signOut()` -> `signOut()` (سطر 287) |
| 6 | `src/contexts/FiscalYearContext.tsx` | try/catch لـ `localStorage.removeItem` (سطر 35) |
| 7 | `supabase/functions/admin-manage-users/index.ts` | إضافة `validateUuid(userId)` في `delete_user` (سطر 179) |

## تحديث الاختبارات

- `src/hooks/useNotifications.test.ts` يستخدم `'payment'` و `'message'` كأنواع -- يجب تحديثها إلى `'info'` و `'success'` لتتوافق مع الأنواع الصالحة.

