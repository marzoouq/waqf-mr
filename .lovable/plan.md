
# تقرير الفحص الجنائي المعمق والشامل
## نظام ادارة الوقف — فحص كل ملف ومجلد وسياسة

---

## الملخص التنفيذي

تم فحص **~113 ملف مصدري** و**19 جدول قاعدة بيانات** و**7 وظائف حواف** و**29 مشغل (Trigger)** و**~55 سياسة RLS** و**57 اعتمادية (dependency)** و**22 اعداد نظام**. النتيجة العامة: النظام **متين امنيا** مع وجود **5 ملاحظات حقيقية** تستحق الانتباه (3 متوسطة الخطورة + 2 منخفضة).

---

## المنهجية

### ما تم فحصه بالتفصيل:

| المجال | عدد العناصر المفحوصة |
|---|---|
| ملفات المصادقة والتفويض | `AuthContext.tsx`, `Auth.tsx`, `ProtectedRoute.tsx`, `App.tsx` |
| وظائف الحواف (Edge Functions) | 7 وظائف: `admin-manage-users`, `guard-signup`, `lookup-national-id`, `check-contract-expiry`, `auto-expire-contracts`, `ai-assistant`, `generate-invoice-pdf` |
| ملف CORS المشترك | `_shared/cors.ts` |
| سياسات RLS | ~55 سياسة على 19 جدول |
| المشغلات (Triggers) | 29 مشغل نشط |
| هوكات البيانات | `useCrudFactory`, `useIncome`, `useExpenses`, `useContracts`, `useBeneficiaries`, `useAccounts`, `useInvoices` |
| الاشعارات | `notifications.ts`, `useNotifications`, `useMessaging` |
| حماية المحتوى | `index.html` (CSP), `SecurityGuard.tsx` |
| التخزين | localStorage usage (4 ملفات) |
| البيانات الحية | `beneficiaries` (14 سجل), `user_roles`, `contracts`, `fiscal_years`, `app_settings` |
| تقارير PDF | 10 ملفات في `utils/pdf/` |
| صفحات الواجهة | ~28 صفحة (admin + beneficiary + public) |

---

## النتائج التفصيلية

### (1) ثغرة متوسطة: `notifyAllBeneficiaries` تُستدعى من العميل بدون تحقق من الدور

**الملفات المتاثرة:** `useIncome.ts` (سطر 20), `useExpenses.ts` (سطر 20), `AccountsPage.tsx` (اسطر 279, 286, 372)

**الشرح:** عند اضافة دخل او مصروف جديد، يتم استدعاء `notifyAllBeneficiaries` عبر `supabase.rpc()` من كود العميل (المتصفح). دالة `notify_all_beneficiaries` في قاعدة البيانات هي `SECURITY DEFINER` وتُدرج اشعارات لجميع المستفيدين.

**المخاطر:**
- تم سحب صلاحيات `EXECUTE` من `PUBLIC` و `anon` (حسب الذاكرة) — هذا جيد
- لكن اي مستخدم مصادق (`authenticated`) يمكنه نظريا استدعاء هذه الدالة مباشرة وارسال اشعارات مزيفة لجميع المستفيدين
- المستفيد يملك دور `authenticated` ويمكنه استدعاء `supabase.rpc('notify_all_beneficiaries', ...)` من console المتصفح

**الاصلاح المطلوب:** اضافة فحص دور المستدعي داخل دالة `notify_all_beneficiaries` و `notify_admins`:
```sql
-- اضافة في بداية الدالة:
IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
  RAISE EXCEPTION 'غير مصرح';
END IF;
```

**الخطورة:** متوسطة — يمكن استغلالها لارسال اشعارات مضللة

---

### (2) ملاحظة متوسطة: `lookup-national-id` لا يتحقق من هوية المستدعي

**الملف:** `supabase/functions/lookup-national-id/index.ts`

**الشرح:** هذه الوظيفة مفتوحة بالكامل (بدون مصادقة) — اي شخص يعرف عنوان الـ API يمكنه ارسال ارقام هوية والتحقق من وجودها.

**الحماية الحالية:**
- Rate limiting: 3 طلبات/دقيقة لكل IP (جيد)
- تاخير ثابت 300ms لمنع timing attacks (ممتاز)
- رد ثابت 200 OK لمنع تعداد عبر اكواد الحالة (ممتاز)

**المخاطر المتبقية:**
- Rate limiter في الذاكرة (in-memory) — يُفقد عند اعادة تشغيل الدالة (cold start)
- عند استخدام عدة instances، كل instance له عداد منفصل
- رغم ان الرد لا يكشف هوية الشخص، الا انه يكشف **البريد الالكتروني الكامل** (`email` field) عند وجود تطابق — وهذا تسريب PII

**الاصلاح المقترح:**
- الخيار الامثل: ارجاع `found: true` فقط بدون ارجاع البريد الكامل، واستخدام البريد داخليا لتسجيل الدخول مباشرة
- او: حجب جزء من البريد (مثل `a***@gmail.com`)

**الخطورة:** متوسطة — تسريب البريد الالكتروني عبر رقم الهوية

---

### (3) ملاحظة متوسطة: `guard-signup` لا يعين دورا للمستخدم الجديد

**الملف:** `supabase/functions/guard-signup/index.ts` (سطر 87-98)

**الشرح:** عند التسجيل العام (عندما يكون `registration_enabled = true`)، يتم انشاء المستخدم عبر Admin API بدون تعيين اي دور في جدول `user_roles`. هذا يعني:
- المستخدم يتم انشاؤه بنجاح
- لكن عند تسجيل الدخول، `AuthContext` يحاول جلب الدور ويفشل (لا يوجد سجل في `user_roles`)
- يظهر للمستخدم "لم يتم التعرف على صلاحياتك" بعد 5 ثوان
- المستخدم يبقى معلقا بدون امكانية الوصول لاي صفحة

**الحالة الفعلية:** التسجيل معطل حاليا (`registration_enabled = false`) — لذا هذه ليست ثغرة نشطة لكنها خلل تصميمي يجب اصلاحه قبل تفعيل التسجيل العام مستقبلا.

**الاصلاح المقترح:** اضافة تعيين دور افتراضي (مثلا `beneficiary`) بعد انشاء المستخدم في `guard-signup`، او توضيح في الواجهة ان الحساب يحتاج موافقة الناظر.

**الخطورة:** متوسطة (مشروطة بتفعيل التسجيل)

---

### (4) ملاحظة منخفضة: `dangerouslySetInnerHTML` في الصفحة الرئيسية

**الملف:** `src/pages/Index.tsx` (اسطر 104, 108)

**الشرح:** يتم استخدام `dangerouslySetInnerHTML` لحقن JSON-LD لاغراض SEO. البيانات مصدرها:
- `jsonLd`: كائن ثابت مُعرّف في الكود (لا يتاثر بمدخلات المستخدم)
- `webAppJsonLd`: كائن ثابت ايضا

**التقييم:** امن لان البيانات لا تتضمن مدخلات مستخدم. استخدام `JSON.stringify()` يمنع حقن HTML.

**الخطورة:** منخفضة — لا خطر فعلي لكن يُفضل توثيقه

---

### (5) ملاحظة منخفضة: `getClaims` بدلا من `getUser` في وظائف الحواف

**الملفات:** `ai-assistant`, `auto-expire-contracts`, `check-contract-expiry`, `generate-invoice-pdf`

**الشرح:** تستخدم 4 وظائف `getClaims(token)` للتحقق من هوية المستخدم بدلا من `getUser()`. بينما `admin-manage-users` يستخدم `getUser()`.

**التقييم:**
- `getClaims` اسرع لانه يفك JWT محليا بدون طلب للخادم
- لكنه **لا يتحقق** من ان التوكن لم يُبطل (مثلا بعد تسجيل خروج او تغيير كلمة المرور)
- في المقابل، `getUser()` يتحقق من صلاحية الجلسة فعليا من الخادم

**المخاطر:** اذا قام الناظر بحذف مستخدم او تغيير كلمة مروره، يمكن للتوكن القديم الاستمرار في العمل حتى انتهاء صلاحيته (عادة ساعة)

**التوصية:** استخدام `getUser()` في الوظائف الحساسة مثل `auto-expire-contracts` و `generate-invoice-pdf`، والابقاء على `getClaims` في `ai-assistant` حيث السرعة اهم.

**الخطورة:** منخفضة — نافذة الاستغلال محدودة بعمر التوكن

---

## ما تم التحقق منه وهو سليم

### قاعدة البيانات
- **RLS مفعّل** على جميع الجداول الـ 19 بدون استثناء
- **سياسات RESTRICTIVE** مطبقة على جداول السنوات المالية (contracts, expenses, income, invoices)
- **سجل المراجعة** محمي تماما: لا حذف، لا تعديل، الادراج عبر المشغلات فقط
- **سجل الوصول** محمي بنفس الطريقة
- **لا توجد سجلات يتيمة** في `beneficiaries` (جميع الـ 14 سجل مرتبطة بـ `user_id`)
- **مجموع الحصص** = 100% بالضبط (14 مستفيد)
- **المشغلات (29):** تغطي التدقيق + منع تعديل السنوات المقفلة + تحديث `updated_at`

### وظائف الحواف
- **admin-manage-users:** تحقق مزدوج (JWT + admin role) + فحص UUID + قائمة بيضاء للاجراءات + حد 50 مستخدم للانشاء الجماعي
- **guard-signup:** rate limiting + فحص `registration_enabled` من قاعدة البيانات + تحقق من المدخلات
- **check-contract-expiry:** يدعم service_role + admin — مناسب للمهام المجدولة + يمنع تكرار الاشعارات
- **CORS:** قائمة بيضاء صارمة + دعم ديناميكي لنطاقات lovable.app

### الواجهة الامامية
- **لا يتم تخزين الادوار في localStorage** — يتم جلبها من `user_roles` في كل جلسة
- **localStorage يُستخدم فقط لـ:** اعدادات المظهر، السنة المالية المختارة، تفضيلات الاشعارات، نسخة التخزين المؤقت
- **CSP مشددة:** بدون `unsafe-eval`، مع `frame-src blob:` لعارض الفواتير
- **رسائل الخطأ امنة:** `getSafeErrorMessage()` يحول الاخطاء التقنية لرسائل عربية بدون كشف تفاصيل
- **حماية المسارات:** `ProtectedRoute` يتحقق من الدور مع timeout + محاولة اخيرة لجلب الدور
- **فصل المسؤوليات:** الناظر والمحاسب فقط يصلون للـ dashboard، المستفيد والواقف يصلون لواجهة المستفيد
- **idle timeout** مع تحذير قبل دقيقة

### التخزين
- **invoices bucket:** خاص (private) — الوصول عبر signed URLs فقط
- **waqf-assets bucket:** عام — يحتوي فقط على شعار وخطوط (لا بيانات حساسة)

### الاعتماديات
- **57 حزمة** بدون ثغرات امنية معروفة
- جميع الحزم محدثة

---

## خلاصة الاجراءات المطلوبة

| الرقم | الاجراء | الخطورة | نوع التغيير |
|---|---|---|---|
| 1 | اضافة فحص دور المستدعي في `notify_all_beneficiaries` و `notify_admins` | متوسطة | migration SQL |
| 2 | حجب البريد الالكتروني في رد `lookup-national-id` | متوسطة | Edge Function |
| 3 | تعيين دور افتراضي في `guard-signup` او توضيح في الواجهة | متوسطة | Edge Function |
| 4 | استبدال `getClaims` بـ `getUser` في الوظائف الحساسة | منخفضة | Edge Functions |
| 5 | توثيق استخدام `dangerouslySetInnerHTML` (لا تغيير مطلوب) | منخفضة | لا تغيير |

---

## التفاصيل التقنية للاصلاحات

### الاصلاح 1: تامين دوال الاشعارات (SQL Migration)

```sql
-- تعديل notify_all_beneficiaries لتقييد الاستدعاء للناظر والمحاسب فقط
CREATE OR REPLACE FUNCTION public.notify_all_beneficiaries(...)
  -- اضافة في بداية الدالة:
  IF NOT public.has_role(auth.uid(), 'admin') 
     AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بارسال اشعارات جماعية';
  END IF;

-- نفس التعديل في notify_admins
```

### الاصلاح 2: حجب البريد في lookup-national-id

```typescript
// بدلا من ارجاع email الكامل:
// return { email, found: true }
// ارجاع البريد المحجوب:
const masked = email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');
return { email: masked, found: true }
```

ثم في `Auth.tsx` يتم تعديل المنطق لاستخدام البريد المحجوب للعرض فقط، مع ارسال `national_id` مباشرة لوظيفة تسجيل الدخول الخاصة.

### الاصلاح 3: guard-signup

خياران:
- اضافة دور افتراضي `beneficiary` مع `share_percentage: 0`
- او ارجاع رسالة واضحة للمستخدم: "تم انشاء حسابك بنجاح. يرجى انتظار موافقة الناظر لتفعيل صلاحياتك"

### الاصلاح 4: getClaims vs getUser

في `auto-expire-contracts` و `generate-invoice-pdf`:
```typescript
// بدلا من:
const { data: claimsData, error } = await userClient.auth.getClaims(token);
// استخدام:
const { data: { user }, error } = await userClient.auth.getUser();
```

