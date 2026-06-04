# فحص ربط الأزرار والصلاحيات — خطة مُنقَّحة (P0 توحيد المصادر، ثم Audit، ثم اختبارات)

## النتائج المؤكدة من الفحص (قبل أي تعديل)

| البند | الحالة |
|---|---|
| عدد صفحات/مسارات Admin | **22** (وليس 24) |
| عدد صفحات Beneficiary | 17 ملف، **16 مساراً** (SupportPageGuard wrapper) |
| `DEFAULT_ROLE_PERMS.beneficiary.financial_reports` | **مفقود** — والمسار `/beneficiary/financial-reports` يستخدم `permKey: financial_reports` |
| `DEFAULT_ROLE_PERMS.beneficiary.carryforward` | **مفقود** — والمسار `/beneficiary/carryforward` يستخدم `permKey: carryforward` |
| `DEFAULT_ROLE_PERMS.{beneficiary,waqif}.reports` | **legacy غير مستخدم** — لا يطابق أي `permKey` في `BENEFICIARY_ROUTES` |
| `ROLE_SECTION_DEFS` يحتوي `financial_reports` / `carryforward` | **لا** — `RolePermissionsTab` لا يعرضهما |
| `RequirePermission` يقبل prop `section` | **لا** — يعتمد على `location.pathname` |
| `usePermissionCheck` سلوكه عند `permKey` غير معرّف | **مسموح صامتاً** (opt-out) → ثغرة تحكم فعلية |

→ هذه ثغرات حقيقية في **مصادر الحقيقة**؛ Audit الأزرار قبل إصلاحها = ضوضاء.

---

## الجولة P0 — توحيد مصادر الصلاحيات (شرط مسبق)

### تعديلات `src/constants/rolePermissions.ts`
- إضافة للمستفيد: `financial_reports: true`, `carryforward: true`.
- إضافة للواقف: `financial_reports: true` (وحذف `share/disclosure: false` إن أُريد، أو تركها — تُحسم في نقطة قرار أدناه).
- إزالة المفتاح القديم `reports` من كتلتي `beneficiary` و`waqif` (لا يطابق أي مسار في `BENEFICIARY_ROUTES`).
- إبقاء `reports` للمحاسب فقط (يطابق `/dashboard/reports`).

### تعديلات `src/constants/sections.ts` (`ROLE_SECTION_DEFS`)
- إضافة صفّين:
  - `{ key: 'financial_reports', roles: ['beneficiary', 'waqif'] }`
  - `{ key: 'carryforward', roles: ['beneficiary'] }` (وفق قرار واقف أدناه)

### نقاط قرار صريحة (نطلب تأكيد المستخدم قبل التنفيذ)
1. هل يرى الواقف `/beneficiary/carryforward`؟ افتراض الخطة: **لا**.
2. هل يبقى مسار `/waqif` (لوحة منفصلة) أم يُكتفى بدخوله مسارات beneficiary؟ افتراض: **يبقى**.

### اختبار يمنع التراجع (P0)
`src/test/permissionKeysCoverage.test.ts`:
- لكل route في `ADMIN_ROUTES`/`BENEFICIARY_ROUTES` فيه `permKey`: يجب أن يوجد إدخال مطابق في `DEFAULT_ROLE_PERMS` لكل دور مسموح به على المسار.
- لكل `permKey` في الجانب البَنيفيشري: يجب أن يوجد صف مطابق في `ROLE_SECTION_DEFS`.
- لا توجد مفاتيح في `DEFAULT_ROLE_PERMS.{beneficiary,waqif}` بدون مسار يستهدفها (يكشف dead keys مثل `reports`).

---

## الجولة A — Audit AST دقيق (تقرير فقط)

### الأداة
سكربت `scripts/audit-ui-permissions.mjs` يستخدم **`ts-morph`** (لا regex) — مع fallback regex مكشوف الحدود.

### المخرجات
- `/mnt/documents/ui-permissions-audit.csv` بالأعمدة:
  `role, route, section_key, perm_key, file, line, element_type (Button/Link/TabsTrigger/DropdownMenuItem/MenuItem), label, handler_kind (onClick/onSelect/asChild-Link/form-submit/Link.to), handler_resolved (yes/no/composite), guarded_by (route|RequirePermission|inline-hasRole|none), status`
- `ui-permissions-audit.md` ملخص عربي: العدد، الفجوات الحقيقية المصنفة، استثناءات موثقة.

### حدود معترف بها صراحة
- العناصر `asChild`، props العابرة، handlers من Context/Hooks → تُصنَّف `handler_kind=composite, handler_resolved=composite` بدلاً من إعلانها broken.
- الـ Audit **استكشافي**؛ القرار النهائي على كل GAP يكون يدوياً.

### معايير قبول الجولة A
- التقرير يُولَّد دون أخطاء.
- كل route admin/beneficiary مذكور في التقرير ولو بسطر `no-buttons`.

---

## الجولة B — إصلاحات موجَّهة (بعد قراءة Audit)

قاعدة: **لا تعديل لمنطق الأعمال، فقط wiring/guards**. كل GAP يُصنَّف إلى:
- **GAP-HIDDEN** (مرئي لدور يجب حجبه): إصلاحه إما في `routeRegistry` (تصحيح roles على المسار) أو إضافة guard عبر `useAuth().role`/`usePermissionCheck`.
- **GAP-VISIBLE-ROUTE** (مسار غير محمي بالأدوار الصحيحة): تعديل `pr(ROLES, …)` في `adminRoutes`/`beneficiaryRoutes`.
- **GAP-NO-HANDLER**: إن كان dead UI → حذف؛ وإلا ربط بـ hook صحيح من `hooks/page/`.

**ملاحظة على `RequirePermission`**: لن نضيف `section` prop (احترام قاعدة عدم لمس ملفات الحماية بلا طلب). الاعتماد يبقى على `usePermissionCheck` المبني على `routeRegistry`، الذي سيكون متّسقاً بعد P0.

---

## الجولة C — اختبارات تعاقدية (منع التراجع)

1. **`permissionKeysCoverage.test.ts`** (من P0 أعلاه).
2. **`roleRouteAccess.test.tsx`**: لكل دور (admin/accountant/beneficiary/waqif) ولكل route معروف، render داخل `MemoryRouter` مع mocks خفيفة (`useAuth`, `useAppSettings`, `QueryClient`) والتأكد من `Navigate` المتوقع. mocks مركزية في `src/test/__mocks__/authPerms.ts` لتقليل الهشاشة.
3. **(اختياري) `criticalButtonsRender.test.tsx`**: 5–8 صفحات حساسة فقط (Properties, Contracts, Invoices, Expenses, Distributions, UserManagement, MySharePage, SupportPage)، نتحقق فقط من **ظهور الزر** وفق الدور — لا نختبر `onClick !== undefined` (هش، كما لاحظ المراجع).

### معايير القبول النهائية
- `bunx vitest run` ينجح بالكامل (سنذكر الرقم الفعلي بعد التشغيل، لا قبله).
- `bunx tsc --noEmit` نظيف.
- صفر سطر `GAP-*` متبقٍّ بدون قرار موثَّق (إصلاح أو استثناء في `audit-exceptions.md`).
- 0 تعديل في `AuthContext`, `ProtectedRoute`, `RequirePermission`, `client.ts`, `types.ts`, migrations جديدة.

---

## التسليمات للمستخدم
- `/mnt/documents/ui-permissions-audit.csv` + `.md`
- ملف `audit-exceptions.md` لأي GAP مرفوض الإصلاح بقرار صريح
- ملخّص في الدردشة: ما أُصلح، ما استُثني، الاختبارات الجديدة، نتائج التشغيل الفعلية

## أسئلة قبل البدء
1. هل تُؤكِّد إصلاحات P0 على `DEFAULT_ROLE_PERMS`/`ROLE_SECTION_DEFS` (إضافة `financial_reports`, `carryforward` وإزالة `reports` legacy للمستفيد/الواقف)؟
2. هل يرى **الواقف** `carryforward`؟ افتراضي = لا.
3. هل تقبل أن `RequirePermission` يبقى كما هو دون إضافة prop `section`؟
