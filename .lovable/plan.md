# خطة: تنظيف تشخيص النظام وتوسيع تسجيل Backend

الهدف: إزالة تراكم الأخطاء بعد التشخيص، توسيع معلومات Backend (HTTP status + زمن + اسم الدالة)، إضافة اختبار محلي لـ `health-check`، وإصلاح اثنين من الإخفاقات الحقيقية (`waqf-assets` غير مكتشَف رغم وجوده + غياب وسم manifest).

---

## 1) تنظيف Runtime Error من فحص `health-check`

**المشكلة:** `supabase.functions.invoke('health-check')` يستدعي 401 وتلتقطه دالة الفحص (status=pass) لكن SDK يُسجّل الخطأ كـ `RUNTIME_ERROR` في طبقة عرض الأخطاء قبل الوصول للكاتش، فيظهر تراكم.

**الحل:** استبدال `supabase.functions.invoke` في فحص واحد فقط (`checkBackendEdgeHealthPing`) بـ `fetch` مباشر إلى `${VITE_SUPABASE_URL}/functions/v1/health-check` مع `Authorization: Bearer <anon>` و`apikey`. هذا يلتقط الاستجابة بدون أن يمر عبر معترض أخطاء SDK، ويُمكّننا من قراءة `response.status` و`response.headers` بدقة.

تفسير الحالات:
- 200 → `pass` ("سليمة، Xms")
- 401 → `pass` ("محمية بسر، Xms") — متوقع في الـ frontend
- 503 → `warn` ("degraded، Xms")
- 5xx أخرى أو شبكة → `fail`

---

## 2) توسيع تسجيل Backend في فحوصات Edge

تعميم نمط الـ fetch المباشر في **فحص واحد إضافي تجريبي**: ping خفيف لـ `health-check` فقط (لا نضرب بقية 18 دالة). نُعيد `CheckResult.detail` بصيغة:

```
[GET /health-check] status=401 ms=124 name=health-check
```

كما نُضيف فحصاً ثانياً اختيارياً `backend_functions_url_reachable` يتحقق فقط من أن مسار `/functions/v1/` لا يُرجع 5xx (HEAD أو OPTIONS) — مفيد لتشخيص مشاكل CORS/Routing بدون استدعاء دالة فعلية.

---

## 3) إصلاح فحص `waqf-assets` (إخفاق كاذب)

**المشكلة:** `storage.listBuckets()` من client بـ anon/auth قد يُرجع قائمة فارغة بسبب RLS، فيُبلَّغ "مفقود: waqf-assets" رغم وجوده فعلياً.

**الحل:** قبل البتّ بـ `fail`، نُجرّب fallback:
```ts
const { error: probe } = await supabase.storage.from('waqf-assets').list('', { limit: 1 });
```
إذا لم يكن هناك خطأ شبكي/404 على bucket → `pass` ("متاح عبر RLS"). إذا أعاد `Bucket not found` → `fail` حقيقي.

---

## 4) إصلاح Web App Manifest المفقود

**المشكلة:** لا يوجد ملف manifest ولا وسم `<link rel="manifest">` في `index.html`.

**الحل:**
- إنشاء `public/manifest.webmanifest` بالحد الأدنى: name, short_name, theme_color (من `--primary`), background_color, display: standalone, start_url: "/", icons (192/512 الموجودة بالفعل في `public/`).
- إضافة سطر واحد في `<head>` لـ `index.html`:
  ```html
  <link rel="manifest" href="/manifest.webmanifest" />
  ```
- لا service worker جديد، لا offline — Manifest-Only فقط (وفق إرشادات skill/pwa).

---

## 5) اختبار محلي لـ `health-check`

ملف جديد: `src/lib/diagnostics/checks/backend.test.ts` (Vitest)

اختبارات:
1. mock لـ `fetch` يُرجع `{status:200}` → نتيجة `pass` ورسالة تحتوي `200`
2. mock يُرجع `{status:401, body:{error:"Unauthorized"}}` → `pass` ورسالة "محمية بسر" + لا exception ينطلق خارج الدالة
3. mock يُرجع `{status:503}` → `warn`
4. mock يرمي خطأ شبكة → `fail`

هذا يثبت أن المصادقة وتفسير الاستجابة يعملان في dev/preview/prod (لأن المنطق نفسه يُختبَر بدون اعتماد بيئي).

---

## 6) ما لن نفعله

- لن نُغيّر `health-check/index.ts` (السر المشترك مقصود).
- لن نضرب 18 Edge Function للـ ping (ضوضاء شبكة + مصادقة فردية).
- لن نُسجّل `HEALTH_CHECK_SECRET` في الـ frontend (أمن).
- لن نُضيف service worker — Manifest-Only.
- لن نلمس التحذيرات الأخرى (إذن الإشعارات، ZATCA، مستفيدون بلا حساب بنكي، أزرار بلا معالج، أداء الصفحات) — هذه نتائج تشخيص صحيحة تخص بيانات/إعدادات المستخدم، ليست أخطاء برمجية يجب تنظيفها.

---

## الملفات

**جديدة:**
- `public/manifest.webmanifest`
- `src/lib/diagnostics/checks/backend.test.ts`

**معدَّلة:**
- `src/lib/diagnostics/checks/backend.ts` (fetch مباشر + fallback bucket + status/ms/name في detail)
- `index.html` (سطر `<link rel="manifest">`)

لا migrations، لا edge functions جديدة، لا تغييرات DB.
