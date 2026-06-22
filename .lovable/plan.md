# خطة الفحص الجنائي الشامل V2 — Forensic Audit 2026-06-22

تنفيذ مباشر وعميق باستخدام كل الأدوات والوكلاء المتاحين. لا تعديلات على الكود — تقرير فقط.

## آلية التنفيذ (موازية قدر الإمكان)

### الجولة 1 — جمع إشارات تلقائية (4 أدوات بالتوازي)
1. `supabase--linter` (Live + Test)
2. `security--run_security_scan` + `security--get_scan_results`
3. `supabase--db_health` + `supabase--slow_queries`
4. `npm run audit` (scripts/audit-all.mjs) → يولّد CSV/MD محدّثة

### الجولة 2 — 7 وكلاء فرعيون متوازيون (`spawn_agent`)
كل وكيل يكتب إلى `audit/forensic-2026-06-22/M{n}-*.md`:

| # | الوكيل | النطاق |
|---|--------|--------|
| M1 | DB & RLS | جداول بدون RLS/GRANTs، policies بـ `USING(true)`، SECURITY DEFINER بدون `search_path`، 365 migration للتعارضات |
| M2 | Edge Functions | 24 وظيفة: `getUser()`، Zod، CORS، تسريب أسرار في logs، استخدام service role غير مشروع |
| M3 | Routes & Pages | كل route لديه `ProtectedRoute` صحيح، صفحات يتيمة، روابط مكسورة، lazy loading |
| M4 | Hooks Layering | انتهاكات Page Hook Pattern، `supabase` خام في pages، `console.*`، toast في data hooks، barrel-of-barrels |
| M5 | UI/Components | hex خام، مكونات >200 سطر، RTL، aria، single H1، تبويبات مكسورة |
| M6 | Integration Matrix | Pages×Hooks×Tables×Edges، types من اتجاه خاطئ، query keys مكررة، realtime غير مُنظّف |
| M7 | Secrets & Keys | `fetch_secrets`، grep لأنماط `sk_/eyJ/PRIVATE KEY/SERVICE_ROLE`، تحقق client bundle، `.env*` |

### الجولة 3 — تحقق يدوي مباشر من الكود
- قراءة عينات حرجة: `App.tsx`, `router.tsx`, `AuthContext.tsx`, `ProtectedRouteHelper.tsx`, `adminRoutes.tsx`, `beneficiaryRoutes.tsx`, `admin-manage-users/index.ts`, `webauthn/index.ts`
- تنفيذ استعلامات psql مباشرة:
  - جداول بدون RLS مفعّل
  - policies تستخدم `auth.role()='authenticated'` بدون `has_role()`
  - GRANTs مفقودة على جداول public
  - دوال SECURITY DEFINER بدون `set search_path`
  - FK بدون فهرس

### الجولة 4 — التجميع والترتيب
ملف نهائي `audit/forensic-2026-06-22/FORENSIC-REPORT.md`:
- Executive Summary (عدّاد بحسب الخطورة)
- جدول الملاحظات: [ID | Severity | Area | Location | Evidence | Impact | Recommendation]
- ترتيب: Critical → High → Medium → Low → Info
- روابط للملفات التفصيلية M1–M7

## المخرجات
```
audit/forensic-2026-06-22/
  FORENSIC-REPORT.md              ← الموحّد (يبدأ القراءة من هنا)
  EXECUTIVE-SUMMARY.md
  M1-database-rls.md
  M2-edge-functions.md
  M3-routes-pages.md
  M4-hooks-layering.md
  M5-components-ui.md
  M6-integration-matrix.md
  M7-secrets-keys.md
  raw/
    linter-live.json
    linter-test.json
    security-scan.json
    db-health.txt
    psql-queries.sql
```

## القيود (ما لن يتم)
- لا تعديل على أي ملف إنتاج
- لا migrations جديدة
- لا حذف/تعديل سياسات أو دوال
- لا تشغيل/حذف Edge Functions
- لا تعديل ESLint config أو إصلاح أخطاء lint قائمة
- الإصلاحات تُقترح داخل التقرير فقط، تُنفّذ في جولة لاحقة بأمرك

## التقدير الزمني
- جولة 1: ~1 دقيقة
- جولة 2: ~7-10 دقائق (متوازي)
- جولة 3: ~3 دقائق
- جولة 4: ~2 دقيقة
- **الإجمالي: ~15 دقيقة**

## بعد موافقتك
سأبدأ التنفيذ فوراً بالجولة 1 والجولة 2 بالتوازي، ثم أُرسل لك التقرير الموحّد مع أبرز 10 ملاحظات حرجة في الرد.
