# إصلاح الانتهاكين الحرجين — Core Modularization v7

## الانتهاكان

1. `pages/Auth.tsx:7` يستورد `useSetting` من `@/hooks/data/settings/app/useAppSettings`
2. `pages/beneficiary/BeneficiaryDashboard.tsx:6` يستورد `useBeneficiaryWidgets` من `@/hooks/data/settings/notifications/useBeneficiaryWidgets`

كلاهما يخرق قاعدة Page Hook Pattern (الصفحة تستورد فقط من `hooks/page/`، `hooks/application/`، `components/`، `lib/`، `types/`).

## التغييرات

### 1) `src/hooks/application/useAuthPage.ts`
- إضافة `import { useSetting } from '@/hooks/data/settings/app/useAppSettings'`
- استدعاء `const waqfLogoUrl = useSetting('waqf_logo_url')` داخل الهوك
- تصديره ضمن كائن الإرجاع

### 2) `src/pages/Auth.tsx`
- حذف سطر `import { useSetting } ...`
- حذف `const waqfLogoUrl = useSetting(...)` واستخدامه من نتيجة `useAuthPage()`

### 3) `src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts`
- إضافة `import { useBeneficiaryWidgets } from '@/hooks/data/settings/notifications/useBeneficiaryWidgets'`
- استدعاء `const { isVisible } = useBeneficiaryWidgets()`
- تصدير `isVisible` ضمن الإرجاع

### 4) `src/pages/beneficiary/BeneficiaryDashboard.tsx`
- حذف سطر `import { useBeneficiaryWidgets } ...`
- حذف `const { isVisible } = useBeneficiaryWidgets()` واستخدامه من نتيجة الهوك

## التحقق

تشغيل متوازي:
- `node scripts/audit-conventions-deep.mjs` → يجب أن يصبح Critical = 0
- `node scripts/audit-structure.mjs`
- `node scripts/audit-hooks-layout.mjs`
- `node scripts/audit-ui-permissions.mjs`
- `node scripts/audit-page-controls.mjs`
- `npm run lint:conventions`
- `bunx vitest run src/test/pageControlsCount.test.ts` (تأكيد عدم انحدار)

ومراجعة `audit/conventions-deep-violations.csv` لتأكيد 0 Critical/Warning، ثم تحديث `audit/structure-deep-review.md` بحالة P0 = ✅.

## الاستبعادات

- لا تغيير على المكوّنات أو الـ UI أو السلوك الظاهر للمستخدم.
- لا تغيير على RLS أو migrations أو ملفات محمية.
- لا تغيير على هوكات `hooks/data/*` نفسها (تبقى نقية).
