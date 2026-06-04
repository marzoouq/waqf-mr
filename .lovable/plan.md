# خطة إغلاق ملف فحص الأزرار والصلاحيات (Round W — نهائية)

تتضمن التعديلات الأربعة المعتمدة من المراجعة الصارمة.

## W0 — استخراج `ROUTE_ROLES` كاملاً
- إنشاء `src/constants/routeRoles.ts` يحتوي **كل 39 مساراً صراحة** (22 admin + 16 beneficiary + 1 waqif) — لا fallback لـ `['admin','accountant']`.
- المحتوى يبدأ من `permissionKeysCoverage.test.ts` ثم تُضاف admin routes الـ22 صراحة.
- تحديث `permissionKeysCoverage.test.ts` لاستيراد `ROUTE_ROLES` من المصدر الجديد وحذف التعريف المحلي و الـ fallback.
- إضافة parity check في `routePermissionParity.test.ts`: `keys(ROUTE_ROLES) === keys(ALL_ROUTES)`.

## W1 — Audit عبر TypeScript Compiler API (بدون dependency جديدة)
- إعادة كتابة `scripts/audit-ui-permissions.mjs` باستخدام حزمة `typescript` الموجودة بالفعل في devDependencies (لا `ts-morph`).
- يبني AST عبر `ts.createSourceFile` + `ts.forEachChild` لكشف:
  - `<Button>`/`<DropdownMenuItem>` بدون handler/`type=submit`/`asChild`/Trigger/Link parent.
  - `<TabsTrigger value="X">` بدون `<TabsContent value="X">` في نفس الشجرة.
  - `<Link to="...">` لمسار غير مسجَّل.
  - `supabase.from(...)` خارج `hooks/data/**` و`lib/**`.
  - `variant="destructive"` بدون wrapper تأكيد.
- إن تعذّر AST لأي سبب، يبقى regex لكن **يصرّح في أول 10 أسطر صراحة: "regex-based gap scanner — not full AST/matrix"**.

## W2 — Matrix CSV حقيقية مع تمييز نوع الحماية
- ملف جديد `audit/ui-permissions-matrix.csv` بالأعمدة:
  ```
  route, role, role_allowed, perm_key, section_key,
  effective_allowed, access_basis, status
  ```
- `role_allowed` = `ROUTE_ROLES[route].includes(role)`.
- `effective_allowed` = `role_allowed && (role==='admin' || !perm_key || DEFAULT_ROLE_PERMS[role][perm_key])`.
- `access_basis` ∈ { `role-only`, `role+permission`, `role+section`, `denied-role`, `denied-permission`, `uncontrolled` }.
- **156 data rows + 1 header row** بالضبط (39 مساراً × 4 أدوار).
- `audit/ui-permissions-audit.csv` (الفجوات) يبقى كما هو بأعمدته الحالية + توضيح في الـ MD.

## W3 — اختبارات pure-first

**`src/utils/auth/canAccessRoute.ts`** (helper جديد، pure):
```ts
canAccessRoute({ role, route, rolePerms, adminSections, beneficiarySections }): boolean
```
لا يستورد React ولا hooks. مصدر منطقي وحيد لفحص الوصول.

**`src/test/uiPermissionsMatrix.test.ts`** — يقرأ `ui-permissions-matrix.csv`:
- كل صف `effective_allowed=true` له `access_basis` صالح.
- كل route في `ROUTE_ROLES` ظاهر بأربعة صفوف (دور لكل).
- الـ uncontrolled whitelist لا يحوي مسارات غير موجودة في `ALL_ROUTES`.

**`src/test/roleRouteAccess.test.ts`** — pure، بدون render صفحات:
- 156 حالة × `canAccessRoute()` تطابق `effective_allowed` في الـ matrix.
- smoke render لـ `ProtectedRoute` فقط بثلاث حالات: admin، دور مسموح، دور ممنوع.

**`src/test/buttonHandlerAudit.test.ts`** — يستهلك `audit/ui-permissions-audit.csv`:
- يفشل عند أي `GAP-*` غير مدرج في whitelist موثق.

## W4 — التشغيل والإثبات
- `bunx vitest run` (لا `tsc --noEmit` يدوي — للـ harness/CI).
- `node scripts/audit-ui-permissions.mjs` يولّد التقريرين.
- نسخ `ui-permissions-matrix.csv` و `ui-permissions-audit.md` إلى `/mnt/documents/`.
- تحديث `.lovable/plan.md` بالأرقام الحقيقية النهائية.

## الملفات المتأثرة

**إنشاء:**
- `src/constants/routeRoles.ts`
- `src/utils/auth/canAccessRoute.ts`
- `audit/ui-permissions-matrix.csv`
- `src/test/uiPermissionsMatrix.test.ts`
- `src/test/roleRouteAccess.test.ts`
- `src/test/buttonHandlerAudit.test.ts`

**تعديل:**
- `scripts/audit-ui-permissions.mjs`
- `audit/ui-permissions-audit.md`
- `src/test/permissionKeysCoverage.test.ts`
- `src/test/routePermissionParity.test.ts`
- `.lovable/plan.md`

**عدم لمس:**
- ملفات المصادقة (`AuthContext`, `ProtectedRoute`, `RequirePermission`, `ProtectedRouteHelper`).
- migrations / edge functions / DB schema.
- ملفات Supabase المحمية.
- `package.json` (لا dependencies جديدة).

## معايير القبول الصارمة
1. `bunx vitest run` → 100% pass شامل الاختبارات الجديدة.
2. `ROUTE_ROLES` في `src/constants/routeRoles.ts` يحتوي **39 مفتاحاً** صراحة، ومستهلَكة من ملف الاختبار بلا fallback.
3. `audit/ui-permissions-matrix.csv` = **156 data rows + 1 header**.
4. `canAccessRoute()` pure (لا React، لا hooks، لا I/O).
5. `audit-ui-permissions.mjs` إما AST فعلي عبر `typescript` أو وصف صريح في أول 10 أسطر أنه regex.
6. لا migrations، لا تعديل ملفات محمية، لا dependencies جديدة.

## استثناءات موثقة (whitelist)
موجودة فعلياً في `ALL_ROUTES`:
- `/beneficiary/settings` — إعدادات شخصية.
- `/dashboard` — landing.
- `/beneficiary` — landing.
- `/waqif` — landing بـ role-gate فقط.

(تم حذف `/dashboard/settings/profile` لعدم وجوده في `ALL_ROUTES`.)

## خارج النطاق
- `section` prop لـ `RequirePermission`.
- ترقية إلى `ts-morph`.
- click فعلي لكل زر في 9 صفحات.
- audit للـ edge functions و RLS.
