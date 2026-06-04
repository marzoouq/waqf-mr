## المشكلة

في `src/utils/auth/canAccessRoute.ts` (السطر 80) ترجع `evaluateAccess` للمسارات بلا `permKey` و بلا `sectionKey` نتيجة:

```ts
return { allowed: true, basis: 'role-only' };
```

بينما:

- `scripts/build-permissions-matrix.mjs` يولّد للمسارات نفسها `access_basis = 'uncontrolled'` في `audit/ui-permissions-matrix.csv` (مثلاً `/waqif`@waqif, `/dashboard`@accountant).
- `src/test/roleRouteAccess.test.ts` السطر 81–85 يتوقع صراحة `basis === 'uncontrolled'` لـ `/waqif`@waqif.

النتيجة: اختبار `uncontrolled basis لمسارات بدون permKey/sectionKey (/waqif)` سيفشل، وبقية اختبار 156-حالة سيمر لأنه يقارن `allowed` فقط لا `basis`.

## الإصلاح

تعديل سطر واحد في `src/utils/auth/canAccessRoute.ts`:

```ts
// before
return { allowed: true, basis: 'role-only' };
// after
return { allowed: true, basis: 'uncontrolled' };
```

المنطق: `'role-only'` غير ممكن الوصول إليه فعلياً لأن وجود الدور في `ROUTE_ROLES[route]` بدون أي بوابة إضافية = `uncontrolled` بحسب تعريف الخطة. الفرعان `role+permission` و `role+section` و `role+permission+section` تغطي بقية الحالات.

## التحقق بعد التطبيق

```bash
bunx vitest run src/test/roleRouteAccess.test.ts src/test/uiPermissionsMatrix.test.ts src/test/buttonHandlerAudit.test.ts
node scripts/build-permissions-matrix.mjs   # يجب أن يبقى 156 صفاً
node scripts/audit-ui-permissions.mjs       # يجب أن يبقى 0 GAPs
```

## خارج النطاق

- لا تعديل على `ROUTE_ROLES` أو المصفوفة أو الاختبارات.
- لا migrations.
- ملاحظات التوثيق في تعليق `routeRoles.ts` (التوصيف "17 ADMIN_ROLES + 5 ADMIN_ONLY + /dashboard" بدل 16+6) تُترك لجولة توثيق منفصلة لأنها لا تؤثر على السلوك.