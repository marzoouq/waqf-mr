# خطة إقفال drift التوثيق — منقّحة بعد التحقق الجنائي العميق

تم التحقق المباشر من كل بند في الخطة المقترحة مقابل المصدر الفعلي. النتائج أدناه.

## أ) جدول التحقق من بنود الخطة

| # | الادعاء | الدليل المباشر | الحكم |
|---|---|---|---|
| 1 | `process-email-queue` فقط له `verify_jwt = true`، الباقي `false` | `supabase/config.toml` يُظهر 16 دالة كلها `false` ما عدا `process-email-queue = true` | ✅ صحيح |
| 2 | `health-check` يُرجع `{status: healthy/degraded, timestamp}` بدون `uptime_ms` | `health-check/index.ts` السطر 41-47 | ✅ صحيح |
| 3 | `check-contract-expiry` auth = `isServiceRole` أو admin user (لا `cron_secret`) | `check-contract-expiry/index.ts` السطر 19-58 | ✅ صحيح |
| 4 | `auth-email-hook /preview`: CORS `*` + `LOVABLE_API_KEY` | `auth-email-hook/index.ts` السطر 81-103 | ✅ صحيح |
| 5 | `lookup-national-id`: rate limit = `3 / 300s` | `lookup-national-id/index.ts` السطر 4-5 | ✅ صحيح (لكن `docs/API.md:158` يجب فحصه — موجود لكن لم يُعرض رقم بديل) |
| 6 | `guard-signup` success = `{success, message}` بدون `user` | `guard-signup/index.ts` السطر 128-130 | ✅ صحيح |
| 7 | `dashboard-summary` = `{aggregated, pending_advances, fetched_at}` | `dashboard-summary/index.ts` (نهاية الملف) | ✅ صحيح |
| 8 | Adoption matrix: `check-contract-expiry` = Partial (helper فقط) | يستورد `isServiceRole as checkServiceRole` فقط، لا `authenticate()` | ✅ صحيح |
| 9 | Full adoption حصراً في: `admin-manage-users`, `generate-invoice-pdf` | `grep` لـ `authenticate(` يُرجع هاتين فقط | ✅ صحيح |
| 10 | Partial adoption في: `check-contract-expiry`, `process-email-queue` (`isServiceRole` فقط) | `grep` يؤكد | ✅ صحيح |
| 11 | No adoption في: `email-admin`, `beneficiary-summary`, `lookup-national-id`, `guard-signup`, `auth-email-hook`, `health-check`, `dashboard-summary`, `webauthn`, `ai-assistant`, جميع `zatca-*` | `grep` يؤكد عدم وجود استيراد من `_shared/auth.ts` | ✅ صحيح |

## ب) drift إضافي اكتشفه التحقق ولم يكن في الخطة الأصلية

| # | الموقع | الانحراف | الإصلاح المطلوب |
|---|---|---|---|
| D1 | `docs/api/edge-functions.md:132` | `health-check` Auth: `none` ✅ صحيح، لكن السطر 133 `Response: { status: 'ok', uptime_ms }` خاطئ | تصحيح إلى `healthy/degraded` + `timestamp` (مدمج في البند 1.2 من الخطة الأصلية — مغطّى) |
| D2 | `docs/api/edge-functions.md:145` | `process-email-queue` Auth: `cron_secret` خاطئ — الكود يستخدم `isServiceRole(token)` فعلياً | إضافة بند: استبدال `cron_secret` بـ `service_role JWT (verified via isServiceRole)` |
| D3 | `docs/API.md:145` | تعليق "verify_jwt = false ... قرار واعٍ لتسهيل استدعاء Cron" — مضلّل لأن المصادقة الفعلية عبر `isServiceRole` للـ JWT، وليس استدعاء غير مصادَق | إضافة جملة توضيح: "cron يمرّر `service_role` JWT ويُتحقَّق منه عبر `isServiceRole()` في الكود" |
| D4 | `docs/api/network-inventory.md:22` | `check-contract-expiry` Auth = "service" — يخفي قبول admin user | تحديث إلى "service_role أو admin user" |

## ج) الادعاءات التي ظلّت مدعومة جزئياً فقط

- ادعاء وجود `dashboardSummarySchema` في `useDashboardSummary` لم يُتحقق منه مباشرةً في هذه الجولة. في `.lovable/plan.md` يجب وسمه "غير مُتحقَّق منه — يحتاج إثبات لاحق" بدلاً من اعتباره منفّذاً.
- "التحقق الميداني لـ CORS" لا يوجد له script أو CI artifact — يجب وسمه "موثّق نظرياً فقط".

---

## د) الإجراءات النهائية (4 ملفات Markdown فقط — لا كود)

### 1) `docs/api/edge-functions.md`
- استبدال السطر 25 (`verify_jwt = false متعمَّد لكل الدوال`) بجدول استثناء واضح: `process-email-queue = true`، الباقي `false`.
- السطر 99: تصحيح `check-contract-expiry` Auth إلى: `service_role JWT (cron) أو admin user (متصفح)`. حذف `cron_secret`.
- السطر 133: تصحيح `health-check` Response إلى `{ status: 'healthy' \| 'degraded', timestamp: string }` و status `200/503`.
- السطر 145: تصحيح `process-email-queue` Auth من `cron_secret` إلى `service_role JWT (يُتحقَّق منه عبر isServiceRole)`.
- ضمن الجدول السطر 37: تحديث ملاحظة `check-contract-expiry` لتذكر أن المصادقة admin user أيضاً.
- توضيح في صف `auth-email-hook`: إضافة جملة قصيرة تفصل `/preview` (CORS `*` + `LOVABLE_API_KEY`) عن webhook (HMAC).

### 2) `docs/API.md`
- القسم 3 (`check-contract-expiry`، السطر 137-145): تصحيح ملاحظة المصادقة لتقول "cron يمرّر `service_role` JWT يُتحقَّق منه عبر `isServiceRole()`؛ الأدمن يستطيع الاستدعاء أيضاً من المتصفح".
- القسم 4 (`lookup-national-id`، السطر 158+): تأكيد rate limit الفعلي `3 / 300s` لكل IP، وإضافة وصف concealment المتعمَّد كقرار أمني.
- القسم 5 (`guard-signup`، السطر 185+): تصحيح شكل النجاح إلى `{ success: true, message: string }`. حذف أي ادعاء `{ user: ... }`.
- القسم 12 (`health-check`، السطر 434+): تصحيح الاستجابة إلى `{ status, timestamp }` + `200/503`.
- القسم 13 (`dashboard-summary`، السطر 449+): تصحيح الاستجابة إلى `{ aggregated, pending_advances, fetched_at }`.

### 3) `docs/api/network-inventory.md`
- السطر 22: تحديث `check-contract-expiry` Auth من "service" إلى "service_role أو admin user".
- قسم Auth Adoption Matrix: تمييز ثلاث حالات بدل اثنتين:
  - **Full** (`authenticate()`): `admin-manage-users`, `generate-invoice-pdf`.
  - **Partial** (`isServiceRole` helper فقط): `check-contract-expiry`, `process-email-queue`.
  - **None**: الباقي (مع التبرير الموجود سلفاً).
- تصحيح صف `check-contract-expiry` السطر 68 (✅) إلى Partial.

### 4) `.lovable/plan.md`
- إضافة "Version H — إقفال drift التوثيق" يسرد البنود 1-3 أعلاه.
- حذف/تصحيح أي جملة تدّعي أن `docs/API.md` لا يحتاج تعديلاً.
- وسم "CORS field verification" بـ "موثّق نظرياً فقط — لا يوجد CI/script".
- وسم ادعاء `dashboardSummarySchema` بـ "غير مُتحقَّق منه — يتطلّب فحص `useDashboardSummary` لاحقاً".
- قسم Open Items يبقى كما هو (توحيد `_shared/auth.ts`، CORS CI script، فحص بقية schemas).

---

## هـ) المخاطر

- **0 تغييرات كود.** **0 تعديلات** على Edge Functions, `_shared/*`, `config.toml`, wrappers, client, types.
- 4 ملفات Markdown فقط.
- لا أثر على runtime، UX، عقود API، أو أمن.
- الخطة الأصلية صحيحة 100% فيما طرحته؛ هذه النسخة المنقّحة تضيف 4 تصحيحات drift لم تكن مغطّاة (D1-D4).

## الملفات المُعدَّلة

1. `docs/api/edge-functions.md`
2. `docs/API.md`
3. `docs/api/network-inventory.md`
4. `.lovable/plan.md`

---

## Version H — إقفال drift التوثيق (2026-05-11)

### الهدف
مزامنة `docs/API.md` و`docs/api/edge-functions.md` و`docs/api/network-inventory.md` مع المصدر الفعلي بعد التحقق الجنائي العميق. **0 تغييرات كود.**

### التصحيحات المنفّذة

**`docs/api/edge-functions.md`:**
- استُبدل ادعاء "`verify_jwt = false` متعمَّد لكل الدوال" بجدول استثناءات صريح يُظهر `process-email-queue = true`، الباقي `false`.
- `check-contract-expiry`: تصحيح Auth إلى `service_role JWT (cron)` أو `admin user (متصفح)`. حُذف ذكر `cron_secret` (لم يكن موجوداً في الكود).
- `health-check`: تصحيح Response من `{ status: 'ok', uptime_ms }` إلى `{ status: 'healthy' \| 'degraded', timestamp }` + HTTP `200/503`.
- `process-email-queue`: تصحيح Auth من `cron_secret` إلى `service_role JWT (verify_jwt=true بوابة + isServiceRole كود)`.
- جدول التصنيف: تحديث ملاحظة `check-contract-expiry`.

**`docs/API.md`:**
- §3 `check-contract-expiry`: تصحيح وصف المصادقة (service_role JWT عبر `isServiceRole()` بدلاً من مقارنة token مباشرة).
- §4 `lookup-national-id`: تصحيح rate limit من `5/120s` إلى الفعلي `3/300s`. توثيق concealment المتعمَّد كقرار أمني (`{ found: true, masked_email: '***@***.com' }` عند عدم الوجود).
- §5 `guard-signup`: تصحيح شكل النجاح من `{ user: { id, email, ... } }` إلى الفعلي `{ success: true, message: string }`.
- §12 `health-check`: تصحيح Response shape + HTTP status.
- §13 `dashboard-summary`: تصحيح Response من المسطّح `{ total_income, ... }` إلى الفعلي `{ aggregated, pending_advances, fetched_at }`.

**`docs/api/network-inventory.md`:**
- §1: تحديث صف `check-contract-expiry` Auth من "service" إلى "service_role JWT (cron) أو admin user (متصفح)".
- §6 Adoption Matrix: تمييز ثلاث حالات بدل اثنتين:
  - **Full** (`authenticate()`): `admin-manage-users`, `generate-invoice-pdf` فقط (2/17).
  - **Partial** (`isServiceRole` helper فقط): `process-email-queue`, `check-contract-expiry` (2/17).
  - **None**: 13/17 — مع التبرير الموجود.
- صفّا `process-email-queue` و`check-contract-expiry` انتقلا من ✅ Full إلى Partial — تصحيح drift كان قائماً في الإصدارات السابقة.

### تحفّظات مسجَّلة

- **CORS field verification:** الجدول في `edge-functions.md` و`cors-verification.md` موثَّق نظرياً فقط. لا يوجد CI script ولا artifact runnable داخل المستودع يُثبت إعادة تشغيله. وُسم كـ "موثّق نظرياً" — يحتاج CI script في جولة لاحقة.
- **`dashboardSummarySchema` runtime validation:** ادعاء وجوده في `useDashboardSummary` لم يُتحقَّق منه مباشرةً في هذه الجولة. الادعاء الوحيد المُثبَت هو `supportAnalyticsSchema` في `useSupportAnalytics`. يحتاج فحص لاحق لـ `src/hooks/data/dashboard/useDashboardSummary.ts`.

### Open Items (لم تتغيَّر)

- توحيد `_shared/auth.ts` على functions إضافية (`ai-assistant`, `zatca-signer`, `zatca-xml-generator`, ربما `zatca-report`) — refactor معماري مؤجل.
- تحويل CORS field verification إلى CI script قابل للتشغيل.
- التحقق من بقية schemas الحرجة قبل أي ادعاء اكتمال (`dashboardSummarySchema`, إلخ).
- مراجعة `dispatcher` functions (`dashboard-summary`, `beneficiary-summary`, `email-admin`) لتقييم إمكانية توحيد جزئي.

### الملفات المُعدَّلة

| الملف | نوع التغيير |
|---|---|
| `docs/api/edge-functions.md` | جدول `verify_jwt` + 4 إصلاحات Auth/Response |
| `docs/API.md` | 5 إصلاحات Response/Auth/Rate-limit |
| `docs/api/network-inventory.md` | تصحيح Adoption Matrix (Full/Partial/None) + صف `check-contract-expiry` |
| `.lovable/plan.md` | هذا السجل (Version H) |

**صفر تعديلات على:** Edge Functions، `_shared/*`، `config.toml`، wrappers، client.ts، types.ts، أي ملف مصادقة. **صفر مخاطر runtime/UX/أمن.**
