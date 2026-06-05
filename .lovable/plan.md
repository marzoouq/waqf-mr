# خطة: تحقق شامل + تدقيق صلاحيات + بوابات CI

## 1) تشغيل مصفوفة التحقق (read-only، لا تعديل ملفات)

أنفّذ بالتوازي وأجمع المخرجات:

```bash
bunx vitest run                             # هدف: 1985/1985 خضراء
bun run lint:conventions                    # هدف: 0 مخالفات
npx eslint src/                             # هدف: 0
npx tsc --noEmit                            # هدف: 0
node scripts/audit-ui-permissions.mjs       # هدف: 0 GAPs
node scripts/build-permissions-matrix.mjs   # هدف: 156 صف + header
node scripts/security-gates.mjs             # هدف: 0 انتهاكات
```

أي فشل = أُبلغك بالقائمة الكاملة قبل أي اقتراح إصلاح (الإصلاح يحتاج جولة build منفصلة).

## 2) تدقيق صلاحيات الواجهة (admin/beneficiary/waqif)

- مراجعة `ROUTE_ROLES` (39 مسار) مقابل ملفات `src/routes/*.tsx` للتأكد من المطابقة الصارمة.
- التحقق من أن كل صفحة في `src/pages/dashboard/*` و`src/pages/beneficiary/*` و`src/pages/waqif/*` ملفوفة بـ `pr()` (ProtectedRoute + RequirePermission) عبر `withRouteErrorBoundary`.
- تشغيل `evaluateAccess` ذهنياً عبر اختبار `roleRouteAccess.test.ts` + `uiPermissionsMatrix.test.ts` + `permissionKeysCoverage.test.ts` (موجودة بالفعل) والتأكد من تغطية 39×4 = 156 خلية.
- تشغيل `audit-ui-permissions.mjs` على 449 ملف (الزرار/الروابط) — أي GAP يُدرَج صراحة (بدون whitelist تلقائي).
- فحص يدوي مركّز على نقاط معروفة:
  - `SupportPageGuard` (إعادة توجيه admin/accountant).
  - `usePermissionCheck` (default deny لأي دور غير معروف).
  - `RequirePermission` على المسارات ذات `permKey` (مثل zatca, settings, users).
  - الأزرار الحساسة: إقفال السنة، حذف فاتورة مدفوعة جزئياً، تنفيذ التوزيع.

**لن أُعدّل أي ملف في هذه المرحلة** — فقط تقرير "✅ مطابق" أو قائمة فجوات.

## 3) بوابات CI الجديدة في `.github/workflows/ci.yml`

أضيف 3 خطوات بعد "ESLint check" وقبل "Run tests" (موضع منطقي للفشل المبكر):

```yaml
- name: Lint conventions (lib/hooks/page boundary)
  run: npm run lint:conventions

- name: UI permissions audit (no GAPs)
  run: |
    node scripts/audit-ui-permissions.mjs
    GAPS=$(tail -n +2 audit/ui-permissions-audit.csv | grep -c '^.' || true)
    if [ "$GAPS" -gt 0 ]; then
      echo "::error::وُجدت $GAPS فجوة صلاحيات UI"
      exit 1
    fi

- name: Permissions matrix integrity (156 rows)
  run: |
    node scripts/build-permissions-matrix.mjs
    ROWS=$(tail -n +2 audit/ui-permissions-matrix.csv | wc -l)
    if [ "$ROWS" -ne 156 ]; then
      echo "::error::مصفوفة الصلاحيات: متوقع 156 صف، وُجد $ROWS"
      exit 1
    fi
```

البناء يفشل تلقائياً عند:
- أي مخالفة `lint:conventions` (طبقات lib/hooks/page).
- أي GAP في `audit/ui-permissions-audit.csv`.
- أي انحراف عن 156 صف في مصفوفة الصلاحيات (إضافة/حذف مسار أو دور دون تحديث `ROUTE_ROLES`).

اختبار `buttonHandlerAudit.test.ts` و`roleRouteAccess.test.ts` و`uiPermissionsMatrix.test.ts` المُشغَّلة عبر vitest تكفل التحقق التفصيلي داخلياً.

## 4) المخرجات النهائية لك

- تقرير حالة موجز لكل من الـ 7 سكربتات.
- تقرير تدقيق UI permissions (✅ أو قائمة فجوات بأسطر صريحة).
- diff لـ `.github/workflows/ci.yml` فقط.

## نطاق محظور

- لا تعديل على RLS أو migrations أو edge functions أو UI أو منطق أعمال.
- لا تعديل على ملفات Supabase المحمية.
- لا حذف خطوات CI الموجودة (gitleaks/security-gates/supabase-linter/security-definer/audit/build).
