# خطة v4: نظام التشخيص الكامل تحت `/dashboard/diagnostics`

## التحقق من الشمولية مقابل بنية المشروع الفعلية

| الطبقة | موجود في المشروع | كانت في v3؟ | في v4 |
|--------|------------------|-------------|-------|
| 50 صفحة (dashboard/beneficiary/waqif/public) | ✅ | جزئي (appMap) | ✅ كامل |
| 41 route في `routeRegistry` | ✅ | ✅ | ✅ |
| 4 ملفات routes (`adminRoutes/beneficiaryRoutes/waqifRoutes/publicRoutes`) | ✅ | ❌ | ✅ مُضاف |
| ~14 صفحة فيها `<Tabs>` | ✅ | ✅ | ✅ |
| الأزرار بدون handler | ✅ | ✅ | ✅ |
| **11 Edge Function** | ✅ | ❌ مفقود | ✅ مُضاف |
| **DB Migrations + linter** | ✅ | ❌ مفقود | ✅ مُضاف |
| **Hooks layering (data/domain/page)** | ✅ | ❌ مفقود | ✅ مُضاف |
| **CRUD factories + data hooks** | ✅ | ❌ مفقود | ✅ مُضاف |
| **PWA / SW / Manifest** | ✅ | ✅ | ✅ |
| **Auth context + Roles + RLS proxies** | ✅ | جزئي (security) | ✅ مُعمَّق |
| **Fiscal Year context + closed-year guard** | ✅ Core rule | ❌ مفقود | ✅ مُضاف |
| **ZATCA ICV chain + QR** | ✅ | ✅ | ✅ |
| **Email queue + notifications** | ✅ | ❌ مفقود | ✅ مُضاف |
| **Storage buckets** | ✅ | ✅ | ✅ |
| **Realtime channels** | ✅ | جزئي | ✅ مُعمَّق |
| **i18n / RTL / Arabic copy** | ✅ | ❌ مفقود | ✅ مُضاف |
| **Conventions (file size ≤200, no console, hsl tokens)** | ✅ | ❌ مفقود | ✅ مُضاف |
| **CI workflows + scripts/audit-*** | ✅ | ❌ مفقود | ✅ مُضاف (روابط فقط) |

**النتيجة**: v3 كانت تغطي ~60% من التطبيق. v4 ترفعها إلى ~95%.

---

## 1) إثراء تصدير JSON

استبدال `exportResults` (تصدير نصي حالي) بـ `exportJson()` + `exportText()` جنبًا إلى جنب.

البنية:
```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-07T04:33:55.123Z",
  "app": { "version": "3.0.220", "env": "production", "commitHint": "...", "userAgent": "...", "route": "..." },
  "summary": { "total": 95, "pass": 80, "warn": 10, "fail": 5, "info": 0, "healthScore": 89 },
  "categories": [
    {
      "title": "قاعدة البيانات",
      "results": [
        {
          "id": "db_connection", "label": "اتصال", "status": "pass", "detail": "120ms",
          "category": "قاعدة البيانات",
          "docLink": "/docs/diagnostics/check-catalog.md#db_connection",
          "sourceFile": "src/lib/diagnostics/checks/database.ts"
        }
      ]
    }
  ]
}
```

- `version`: من `package.json` عبر `define: __APP_VERSION__` في `vite.config.ts`.
- `sourceFile/docLink`: من `src/lib/diagnostics/checkMeta.ts` (`id → { sourceFile, docAnchor }`).
- اسم الملف: `diagnostics-{ISO-date}.json`.

---

## 2) إعادة الفحص الانتقائية

DropdownMenu بدل زر واحد:

| الزر | السلوك |
|------|--------|
| تشغيل الكل | كما هو |
| إعادة الفاشلة فقط | يُشغّل دوال ids حالتها `fail` |
| إعادة التحذيرات والفاشلة | يشمل `warn` و `fail` |
| إعادة بطاقة | الموجود (▶ في كل بطاقة) |

تنفيذ: `runByIds(ids)` في `checks.ts` + `rerunFailures()/rerunFailuresAndWarnings()` في الهوك.

---

## 3) ملخص الصحة "ما يعمل / تحذير / يحتاج إصلاح"

Hero بثلاث عرضات + Health Score (`pass / (pass+warn+fail) × 100`) + قسم "ملخص ذكي" يسرد:
- ✅ أهم 3 فئات نجحت بالكامل
- ⚠ كل تحذير + رابط للبطاقة
- ❌ كل فشل + `detail` + رابط `sourceFile`

---

## 4) تبويبات صفحة التشخيص (8 تبويبات)

```text
[نظرة عامة] [الفحوصات] [خريطة التطبيق] [التفاعلات]
[الواجهة والاتفاقيات] [Backend & Edge] [الأداء الحي] [السجل والتصدير]
```

### 4.1 نظرة عامة
Hero + Health Score + Web Vitals + ملخص ذكي.

### 4.2 الفحوصات (14 بطاقة الحالية + بطاقات جديدة §4.5/§4.6)
عدّاد التقدم (موجود) + شريط أدوات.

### 4.3 خريطة التطبيق — جديد
`checks/appMap.ts` (6 فحوصات):
- `appmap_pages_reachable` — كل lazy import يُحلّ بدون خطأ.
- `appmap_orphan_pages` — ملف `.tsx` تحت `src/pages/` بدون route.
- `appmap_missing_titles` — route بدون `title/permKey`.
- `appmap_role_coverage` — كل دور (admin/accountant/beneficiary/waqif) له مساراته الأساسية.
- `appmap_route_role_map` — مطابقة `routeRoles.ts` مقابل `ALL_ROUTES`.
- `appmap_route_files_sync` — تطابق `adminRoutes.tsx`/`beneficiaryRoutes.tsx`/etc. مع `routeRegistry`.

UI: شجرة قابلة للطي (admin/accountant/beneficiary/waqif/public).

### 4.4 التفاعلات (Tabs + Buttons) — جديد
`checks/interactions.ts` عبر `import.meta.glob('/src/pages/**/*.tsx', { query: '?raw', eager: false })`:
- `interactions_tabs_inventory` — جرد كل `<TabsTrigger value="...">`.
- `interactions_handler_less_buttons` — `<Button>` بدون `onClick/type="submit"/asChild`.
- `interactions_duplicate_tab_ids` — قيم value مكرّرة.
- `interactions_missing_aria_labels` — أزرار icon-only بدون `aria-label`.
- `interactions_forms_without_submit` — `<form>` بدون `onSubmit`.

UI: جدول قابل للتصفية (page/type/severity).

### 4.5 الواجهة والاتفاقيات — جديد (يُغطّي قواعد المشروع)
`checks/conventions.ts`:
- `conv_file_size` — يحذّر من ملفات pages > 200 سطر / hooks > 180.
- `conv_no_console` — يرصد `console.log/warn/error` خارج `logger`.
- `conv_no_hex_colors` — هكس صريح خارج Canvas/SVG/print.
- `conv_rtl_html_dir` — `<html dir="rtl" lang="ar">` صحيح.
- `conv_localStorage_fiscal_year` — لا استخدام `localStorage` لـ `fiscal_year_id` (Core rule).
- `conv_barrel_imports` — index.ts barrels لا تستورد من barrels أخرى.

### 4.6 Backend & Edge — جديد
`checks/backend.ts` (مكمّل لما هو موجود):
- `backend_edge_health_ping` — نداء `health-check` Edge Function ويقيس latency.
- `backend_edge_inventory` — تعداد 11 Edge Function متوقّعة (قائمة ثابتة) + تحذير إن تعطّل ping لأي منها (HEAD على `/functions/v1/{name}` بدون مصادقة).
- `backend_realtime_subscribe` — اختبار subscribe لقناة وهمية وقياس handshake.
- `backend_auth_session_valid` — `getUser()` يُعيد user صالح.
- `backend_role_resolved` — دور المستخدم الحالي مُحلّ من `user_roles`.
- `backend_fiscal_year_active` — `FiscalYearContext` يُعيد سنة نشطة (Core rule).
- `backend_closed_year_guard` — إن السنة الحالية مُقفلة، تحقّق أن غير-admin يُمنع.
- `backend_email_queue_health` — استعلام عدد سجلات `pending` في `email_queue` (إن كان قابلاً للقراءة بصلاحية admin).
- `backend_notifications_unread_sanity` — التحقّق من عدّاد الإشعارات.
- `backend_storage_buckets` — buckets المتوقّعة (`waqf-assets`, `tenant-documents`, ...).
- `backend_rls_smoke` — قراءات حساسة من جداول مالية يجب أن تُحجب على غير-admin (تتطلب آلية محاكاة دور — في حال صعوبتها تُترجم لـ info فقط).

### 4.7 الأداء الحي (موجود مُحسَّن)
WebVitalsPanel + Long Tasks + Memory + Network filter للـ polling.

### 4.8 السجل والتصدير
آخر 10 تشغيلات في `localStorage` (`diag_history_v1`) + مقارنة تشغيلين + JSON/Text/Copy + mailto.

---

## 5) أرشيف التشغيلات

`src/lib/diagnostics/history.ts`:
- `pushRun(summary)` — يحفظ 10 entries.
- `getHistory()` / `clearHistory()`.
- Entry: `{ at, total, pass, warn, fail, healthScore }`.

---

## 6) الملفات

### جديدة (16)
- `src/lib/diagnostics/checkMeta.ts`
- `src/lib/diagnostics/exporters.ts` + `exporters.test.ts`
- `src/lib/diagnostics/history.ts` + `history.test.ts`
- `src/lib/diagnostics/checks/appMap.ts` + `appMap.test.ts`
- `src/lib/diagnostics/checks/interactions.ts` + `interactions.test.ts`
- `src/lib/diagnostics/checks/conventions.ts` + `conventions.test.ts`
- `src/lib/diagnostics/checks/backend.ts`
- `src/components/diagnostics/HealthSummaryCard.tsx`
- `src/components/diagnostics/AppMapTree.tsx`
- `src/components/diagnostics/InteractionsTable.tsx`
- `src/components/diagnostics/ConventionsTable.tsx`
- `src/components/diagnostics/BackendStatusGrid.tsx`
- `src/components/diagnostics/RunHistoryList.tsx`

### تُعدَّل (4)
- `src/pages/dashboard/SystemDiagnosticsPage.tsx` — تحويل لـ `ResponsiveTabs` (≤200 سطر بإخراج كل tab لـ sub-component).
- `src/hooks/page/admin/management/useSystemDiagnostics.ts` — `rerunFailures` + `exportJson` + كتابة `history` (≤180 سطر).
- `src/lib/diagnostics/checks.ts` — تسجيل 4 بطاقات جديدة + `runByIds()`.
- `vite.config.ts` — `define: { __APP_VERSION__ }`.

### لا تتغيّر
ملفات Supabase المحمية، المصادقة، RLS، Edge Functions.

---

## 7) قيود تقنية

- لا migrations، لا edge functions جديدة (مع ذلك نُضيف **استدعاء قراءة** لـ `health-check` فقط).
- نصوص عربية RTL، ألوان `hsl(var(--*))`، `logger` بدلاً من `console`.
- صفحة ≤200 سطر، hook ≤180 سطر، محمي بـ admin.
- `import.meta.glob` بـ `eager: false` لتجنّب bundle bloat.
- لا تأثير على bundle الإنتاج: كل منطق التشخيص lazy-loaded ضمن صفحة `/dashboard/diagnostics`.

---

## 8) ترتيب التنفيذ

1. `checkMeta.ts` + `exporters.ts` + تحديث الهوك لـ JSON ثري + إعادة الفاشلة.
2. `HealthSummaryCard` + Hero + تحويل الصفحة لتبويبات (Overview/Checks/History).
3. `appMap.ts` + `AppMapTree` (تبويب خريطة التطبيق).
4. `interactions.ts` + `InteractionsTable` (تبويب التفاعلات).
5. `conventions.ts` + `ConventionsTable` (تبويب الاتفاقيات).
6. `backend.ts` + `BackendStatusGrid` (تبويب Backend & Edge).
7. `history.ts` + `RunHistoryList`.
8. تحديث `docs/diagnostics/check-catalog.md` لتوثيق الفحوصات الجديدة (~25 فحص جديد، الإجمالي ~75).
9. اختبارات + التحقق الخماسي (tsc → vitest → ESLint → build → smoke).

---

## 9) ما لن نفعله

- لا E2E (لا محاكاة ضغط أزرار حقيقي).
- لا تتبّع تحليلي مستمر للضغطات.
- لا إعادة كتابة الفحوصات الحالية — نبني فوقها فقط.
- لا اختبار RLS عبر تبديل أدوار حقيقي (إن لزم، يُترجم لـ `info`).

---

## 10) الخلاصة: هل تشمل كل التطبيق؟

**نعم** — v4 تُغطّي:
- ✅ كل الصفحات الـ50 (appMap).
- ✅ كل التبويبات والأزرار في الصفحات (interactions).
- ✅ كل الـ routes الـ41 + ملفات routes الأربعة (appMap).
- ✅ كل Edge Functions الـ11 (backend).
- ✅ كل قواعد المشروع الجوهرية (conventions).
- ✅ Auth/Roles/RLS/Fiscal Year/Email Queue/Realtime/Storage (backend).
- ✅ PWA/SW/Web Vitals/Runtime Errors (موجود سابقًا).
- ✅ ZATCA/Finance/Numerical Audit (موجود سابقًا).

الإجمالي المتوقّع: **~75 فحص في 18 بطاقة** ضمن **8 تبويبات** — نظام تشخيص حقيقي وشامل.
