# خطة التنفيذ الكاملة — إصلاح صلاحيات anon + استراتيجية API شاملة

## السياق المؤكَّد بعد الفحص

- **الـ trigger موجود فعلاً**: `trg_auto_revoke_anon_execute` (event trigger على `ddl_command_end`) يستدعي `public.auto_revoke_anon_execute()`.
- **سلوكه الحالي**: يسحب `EXECUTE` من `anon` و`PUBLIC` لكل دالة جديدة/معادة الإنشاء في schema `public`، ويمنح `authenticated` إلا إذا كانت في قائمة `service_role_only_functions`. **لا يوجد** استثناء للدوال العامة.
- **الدوال العامة (anon-callable) المطلوبة فقط**: `get_public_stats()` و`log_access_event(...)` — كلتاهما بدون `COMMENT` حالياً.
- **سبب الانحدار**: REVOKE جماعي سابق + غياب وسم استثناء ⇒ `anon` فقد الصلاحية ⇒ خطأ `42501` على `/auth` و`/`.

---

## المرحلة 1 — إصلاح فوري + تحصين الـ trigger (Migration واحدة)

### 1.1 وسم الدوال العامة بـ COMMENT صريح

```sql
COMMENT ON FUNCTION public.get_public_stats() IS
  '[anon-callable] Public landing-page stats. Output filtered by app_settings (admin-controlled visibility).';

COMMENT ON FUNCTION public.log_access_event(text, text, text, jsonb) IS
  '[anon-callable] Pre-auth client error/event logger. Writes to access_logs (RLS prevents user reads).';
```

### 1.2 ترقية `auto_revoke_anon_execute` لاحترام الوسم

التعديل الجوهري: قبل سحب `EXECUTE` من `anon`، تفحص الدالة `obj_description(oid)` بحثاً عن السلسلة `[anon-callable]`. إذا وُجدت، **تتخطّى السحب** وتمنح `anon` صراحةً.

```plpgsql
-- بعد استخراج func_name
IF position('[anon-callable]' in COALESCE(obj_description(obj.objid), '')) > 0 THEN
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', obj.object_identity);
  CONTINUE;
END IF;

-- المسار الافتراضي الحالي (revoke + grant authenticated إذا لم تكن service-role-only)
```

### 1.3 إصلاح فوري للصلاحيات (في نفس الـ migration بعد التعديل)

```sql
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, text, jsonb) TO anon, authenticated;
```

> ملاحظة: التواقيع الفعلية ستُستخرج من `pg_proc` ضمن الـ migration لضمان المطابقة.

---

## المرحلة 2 — توسيع CI Gate (`scripts/supabase-lint-check.mjs`)

- إضافة فحص جديد: استعلام Management API عن جميع الدوال في schema `public` التي تحمل وسم `[anon-callable]` في تعليقها.
- لكل واحدة، التحقق من `proacl` يحتوي `anon=X`.
- إذا فُقدت الصلاحية ⇒ فشل البناء برسالة واضحة تشير إلى الدالة المتأثرة.
- قائمة `ALLOWLIST_ANON` صريحة في السكربت كمصدر حقيقة احتياطي: `['get_public_stats', 'log_access_event']`.
- تحديث `docs/security/security-definer-allowlist.md` بقسم جديد "الدوال العامة (anon-callable)".

---

## المرحلة 3 — طبقة API موحّدة على الكلاينت

### 3.1 `src/lib/api/rpc.ts` (جديد)

Wrapper رفيع حول `supabase.rpc()` يوفّر:

- توقيت تلقائي (`performance.now()`) يُمرَّر إلى `queryMonitor`.
- تصنيف الأخطاء في `class ApiError extends Error` بفئات:
  - `auth` (401/403 من PostgREST)
  - `permission` (`42501` Postgres)
  - `validation` (400 / `22xxx` / `23xxx`)
  - `network` (`TypeError: fetch failed`)
  - `rate_limit` (429)
  - `server` (5xx)
  - `unknown`
- إعادة محاولة فقط لـ `network` / `server` / `rate_limit` بـ exponential backoff: `250ms → 500ms → 1000ms` (حد أقصى 3 محاولات).
- لا إعادة محاولة لـ `permission` / `validation` / `auth`.

### 3.2 توسيع `src/utils/error/getErrorStatus.ts`

إضافة دالة جديدة `classifyError(error)` تُرجع `{ status, code, category }` — مع إبقاء `getErrorStatus` كما هي للحفاظ على التوافق العكسي.

### 3.3 ضبط `src/lib/queryClient.ts` و`queryStaleTime.ts`

- استبدال `retry` ليستخدم `classifyError(error).category`.
- توسيع ثوابت `STALE_*`:
  - `STALE_PUBLIC = 5 * 60_000` (إحصائيات الهبوط)
  - `STALE_DASHBOARD = 30_000` (لوحات)
  - `STALE_REFERENCE = 15 * 60_000` (إعدادات/أدوار)
  - الإبقاء على `STALE_FINANCIAL` كما هو.

### 3.4 Throttle لـ `errorReporter`

- dedupe خلال 5 ثوانٍ بمفتاح `hash(error_name + url)`.
- يقلّل ضوضاء `log_access_event` ويحمي من حلقات الأخطاء.

---

## المرحلة 4 — تحصين CORS لـ Edge Functions

- مراجعة كل `new Response(...)` في `supabase/functions/**/*.ts` للتأكد من تضمين `getCorsHeaders(req)` في كل استجابة (نجاح وخطأ).
- إضافة `Vary: Origin` إلى `getCorsHeaders`.
- لا تعديل على `_shared/cors.ts` نفسه إلا إضافة الـ header.

---

## المرحلة 5 — مراقبة الأداء

في `src/lib/monitoring/queryMonitor.ts`:

- عتبات تنبيه: `> 2000ms ⇒ logger.warn`، `> 5000ms ⇒ logger.error`.
- تتبّع حجم استجابة (`content-length` إن توفّر) للاستعلامات > 100KB.

---

## المرحلة 6 — اختبارات

| الملف | المحتوى |
|---|---|
| `src/lib/api/rpc.test.ts` | تغطية كل فئة خطأ + سلوك backoff + عدم إعادة المحاولة على permission |
| `src/test/publicRpcAccess.test.ts` | اختبار تكامل: anon يستطيع استدعاء `get_public_stats` و`log_access_event` فعلاً |
| `src/test/edgeFunctionAuth.test.ts` (توسيع) | preflight OPTIONS من origin مسموح/مرفوض |

---

## المرحلة 7 — توثيق

- `docs/api/README.md` (جديد): جدول كامل بكل RPC + الدور المستدعي + المعاملات + شكل الاستجابة + رمز الخطأ المعتاد + قاعدة retry/cache.
- `docs/api/edge-functions.md` (جديد): جدول كل Edge Function + origins المسموحة + رؤوس المصادقة المطلوبة.
- تحديث `docs/security/security-definer-allowlist.md` بقسم anon-callable.

---

## ما لن يتغيّر

- منطق الأعمال (RLS، التوزيع، الإقفال، صيغ المحاسبة).
- الملفات المحمية: `supabase/config.toml`, `client.ts`, `types.ts`, `.env`.
- `AuthContext` / `ProtectedRoute` / `SecurityGuard`.
- Edge Functions القائمة (فحص فقط، لا إعادة كتابة).
- قائمة `service_role_only_functions` داخل الـ trigger (تبقى كما هي).

---

## ترتيب التنفيذ

1. **Migration**: ترقية `auto_revoke_anon_execute` + COMMENT + GRANT (تُصلح الشاشة فوراً).
2. توسيع `supabase-lint-check.mjs` + تحديث `security-definer-allowlist.md`.
3. إنشاء `src/lib/api/rpc.ts` + `classifyError` + توسيع `STALE_*`.
4. تحديث `queryClient.ts` + dedupe في `errorReporter`.
5. مراجعة CORS + إضافة `Vary: Origin`.
6. اختبارات (rpc + publicRpcAccess + CORS).
7. توثيق `docs/api/`.

## مخاطر / نقاط انتباه

- **توقيع `log_access_event`**: سيُستخرج من DB قبل كتابة `GRANT` لتجنّب overload mismatch.
- **Trigger يعمل فقط على دوال جديدة**: الإصلاح الفوري بـ `GRANT` ضروري لأن الدالتين موجودتان فعلاً.
- **لا تأثير على دوال admin/accountant**: تعديل الـ trigger يضيف فرعاً جديداً فقط، السلوك الافتراضي يبقى REVOKE.
