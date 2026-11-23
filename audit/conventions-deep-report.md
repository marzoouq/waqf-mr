# Conventions Deep Report

Total violations: **19** (Critical: 7, Warning: 8, Info: 4)

## By rule

| Rule | Count |
|---|---:|
| CommonBarrelOnly | 7 |
| NoToastInDataHooks | 6 |
| HexColors | 4 |
| HooksLayering | 2 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| pages/dashboard/ArchivePage.tsx:16 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/BeneficiariesPage.tsx:1 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/ChartOfAccountsPage.tsx:4 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/ExpensesPage.tsx:1 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/IncomePage.tsx:1 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/OfficialLettersPage.tsx:15 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |
| pages/dashboard/ReportsPage.tsx:7 | CommonBarrelOnly | import مسار فرعي من components/common — استخدم البارّل @/components/common فقط |

## Warnings (top 30)

| File:Line | Rule | Message |
|---|---|---|
| hooks/data/core/crud/useCrudMutations.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useCrudMutations.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:10 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/notifications/useNotificationActions.ts:11 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/settings/app/useAppSettingsWrite.ts:10 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/page/admin/financial/useReceiptVoucherDownload.ts:5 | HooksLayering | hooks/page imports supabase client directly — extract to lib/services/* |
| hooks/page/auth/useOAuthConsent.ts:6 | HooksLayering | hooks/page imports supabase client directly — extract to lib/services/* |