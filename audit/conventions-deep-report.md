# Conventions Deep Report

Total violations: **12** (Critical: 1, Warning: 7, Info: 4)

## By rule

| Rule | Count |
|---|---:|
| NoToastInDataHooks | 7 |
| HexColors | 4 |
| CoreModV7 | 1 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| pages/dashboard/UserManagementPage.tsx:17 | CoreModV7 | page imports from hooks/data/* directly (non-type) |

## Warnings (top 30)

| File:Line | Rule | Message |
|---|---|---|
| hooks/data/core/crud/useCrudMutations.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useCrudMutations.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/core/crud/useListQuery.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/notifications/useNotificationActions.ts:11 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/settings/app/useAppSettingsWrite.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |
| hooks/data/users/useUserManagementMutations.ts:5 | NoToastInDataHooks | hooks/data imports @/lib/notify (transitional — move notification to hooks/page wrapper) |