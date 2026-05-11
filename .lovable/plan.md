# خطة إصلاح ثغرات CORS واختبارات Edge Functions (نسخة محدّثة)

## السياق المؤكَّد بعد الفحص

- **`auth-email-hook`**: يستخدم `*` محلياً + رؤوس مخصّصة `x-lovable-signature`, `x-lovable-timestamp` غير موجودة في `_shared/cors.ts`. يحتوي مساراً للمعاينة (`handlePreview`) تستدعيه أداة Lovable من origin خارجي.
- **`process-email-queue`**: cron-only (يستخدم `isServiceRole` + `LOVABLE_API_KEY`، يُستدعى عبر `pg_net`)، 6 استجابات بدون CORS.
- **`_shared/cors.ts`**: `getAllowedOrigin` يُرجع سلسلة فارغة عند غياب `Origin` header مع وجود `req` ⇒ يكسر استدعاءات السيرفر-إلى-سيرفر.
- **`edgeFunctionAuth.test.ts`**: لا اختبارات CORS/preflight.

---

## المرحلة 1 — تحديث `_shared/cors.ts`

تعديلان فقط:

1. **دعم استدعاءات السيرفر**: إذا كان `req.headers.get('origin')` فارغاً/null، يُرجع `ALLOWED_ORIGINS[0]` بدلاً من سلسلة فارغة. الـ origins المتصفحية غير المعروفة تبقى مرفوضة.
2. **إضافة رؤوس webhook**: إضافة `x-lovable-signature, x-lovable-timestamp` إلى `Access-Control-Allow-Headers`.

`Vary: Origin` موجود مسبقاً.

## المرحلة 2 — توحيد `auth-email-hook` على CORS المشترك (مع استثناء preview)

- استيراد `getCorsHeaders` من `../_shared/cors.ts`.
- استبدال `corsHeaders` المحلي (مسار الـ webhook الرئيسي) باستدعاء `getCorsHeaders(req)` في بداية الـ handler.
- تعديل كل `new Response(...)` في المسار الرئيسي (تقريباً 12 موقعاً) لاستخدام `corsHeaders` الجديد.
- **الإبقاء على `previewCorsHeaders` المحلي مع `*`** في `handlePreview` فقط، مع تعليق صريح:
  ```
  // CORS مفتوح مقصود: مسار /preview يُستدعى من أداة معاينة قوالب البريد في Lovable (origin خارجي).
  // المصادقة تتم عبر LOVABLE_API_KEY في Authorization header، فلا حاجة لتقييد origin.
  ```
- لا تغيير على منطق التحقق من توقيع الـ webhook أو توليد HTML.

## المرحلة 3 — تأمين `process-email-queue`

- استيراد `getCorsHeaders` من `../_shared/cors.ts`.
- إضافة معالج `OPTIONS` في بداية الـ handler.
- إضافة `corsHeaders` لكل الاستجابات الست.
- إضافة تعليق رأس صريح:
  ```
  // cron-only: يُستدعى من pg_cron عبر pg_net (سيرفر-إلى-سيرفر).
  // CORS مُضاف كدفاع عميق فقط — لا متصفحات تستدعي هذه الوظيفة.
  ```

## المرحلة 4 — توسيع `src/test/edgeFunctionAuth.test.ts`

إنشاء `src/test/__helpers__/corsMirror.ts` يحاكي منطق `getAllowedOrigin` و`getCorsHeaders` بـ TypeScript ESM (نسخة 1:1 من Deno). ثم إضافة `describe('CORS preflight & origin allowlist', ...)` بـ 5 اختبارات:

1. origin إنتاجي مسموح (`https://waqf-wise.net`) ⇒ يطابق + `Vary: Origin`.
2. origin preview بنمط UUID ⇒ مسموح.
3. origin مرفوض (`https://evil.example.com`) ⇒ `Access-Control-Allow-Origin` فارغ.
4. غياب origin (سيرفر-إلى-سيرفر) ⇒ يُرجع `ALLOWED_ORIGINS[0]`.
5. preflight `OPTIONS`: التأكد من `Access-Control-Allow-Methods` و`Access-Control-Allow-Headers` (تشمل `x-lovable-signature`).

> **قاعدة `lib vs utils`**: الملف helper اختباري بحت تحت `__helpers__/` ولا يُستورد من تطبيق الإنتاج، فلا يُخالف القاعدة.

## المرحلة 5 — توثيق

- تحديث `docs/api/edge-functions.md` بقسمين:
  - **Origins المسموحة**: قائمة `ALLOWED_ORIGINS` + أنماط preview.
  - **تصنيف الوظائف**: جدول لكل من الـ 18 وظيفة يحدّد "متصفح" / "cron" / "server-to-server (Auth Hook)" + الرؤوس المتوقعة.

---

## ما لن يتغيّر

- منطق التحقق من توقيع الـ webhook في `auth-email-hook`.
- منطق `processBatch` و`utils.ts` في `process-email-queue`.
- `verify_jwt = false` في `supabase/config.toml`.
- بقية الـ 16 وظيفة التي تستخدم `getCorsHeaders(req)` بشكل صحيح.
- `AuthContext`, `ProtectedRoute`, `SecurityGuard`, ملفات Supabase المحمية.

---

## ترتيب التنفيذ

1. تعديل `_shared/cors.ts` (origin افتراضي للسيرفر + رؤوس webhook).
2. توحيد `auth-email-hook/index.ts` (مع الإبقاء على preview مفتوحاً).
3. إضافة CORS لـ `process-email-queue/index.ts` + توثيق cron-only.
4. إنشاء `src/test/__helpers__/corsMirror.ts` + توسيع `edgeFunctionAuth.test.ts` بـ 5 اختبارات.
5. تشغيل `vitest run src/test/edgeFunctionAuth.test.ts` للتحقق.
6. تحديث `docs/api/edge-functions.md`.

## مخاطر / نقاط انتباه

- **حساسية `auth-email-hook`**: أي خطأ يكسر إيميلات التسجيل/إعادة تعيين كلمة المرور. التغيير محصور في CORS فقط.
- **إضافة الرؤوس المخصّصة لكل الوظائف**: `x-lovable-signature`/`x-lovable-timestamp` ستظهر في `Access-Control-Allow-Headers` لكل الـ 18 وظيفة. لا أثر سلبي — المتصفحات تتجاهل ما لا ترسله.
- **افتراضي origin للسيرفر**: استخدام `ALLOWED_ORIGINS[0]` لا يفتح ثغرة لأن المتصفحات لا ترسل طلبات بدون `Origin` header؛ الفرع يُفعَّل فقط للـ server-to-server.
