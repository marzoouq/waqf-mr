# Conventions Deep Report

Total violations: **12** (Critical: 1, Warning: 7, Info: 4)

## By rule

| Rule | Count |
|---|---:|
| NoToastInDataHooks | 6 |
| HexColors | 4 |
| ComponentSize | 1 |
| CoreModV7 | 1 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| pages/OAuthConsent.tsx:8 | CoreModV7 | page imports supabase client directly |

## Warnings (top 30)

| File:Line | Rule | Message |
|---|---|---|
| components/expenses/ExpenseFormDialog.tsx:254 | ComponentSize | component 254 lines > 250 |
| hooks/data/core/crud/useCrudMutations.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useCrudMutations.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:10 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/notifications/useNotificationActions.ts:11 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/settings/app/useAppSettingsWrite.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |