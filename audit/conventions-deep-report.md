# Conventions Deep Report

Total violations: **12** (Critical: 1, Warning: 7, Info: 4)

## By rule

| Rule | Count |
|---|---:|
| NoToastInDataHooks | 6 |
| HexColors | 4 |
| HooksLayering | 1 |
| CoreModV7 | 1 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| pages/MaintenancePage.tsx:10 | CoreModV7 | page imports supabase client directly |

## Warnings (top 30)

| File:Line | Rule | Message |
|---|---|---|
| hooks/data/core/crud/useCrudMutations.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useCrudMutations.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:10 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/notifications/useNotificationActions.ts:11 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/settings/app/useAppSettingsWrite.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/page/auth/useOAuthConsent.ts:6 | HooksLayering | hooks/page imports supabase client directly — extract to lib/services/* |