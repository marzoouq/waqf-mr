# Conventions Deep Report

Total violations: **12** (Critical: 8, Warning: 0, Info: 4)

## By rule

| Rule | Count |
|---|---:|
| NoToastInDataHooks | 6 |
| HexColors | 4 |
| HooksLayering | 2 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| hooks/data/core/crud/useCrudMutations.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/data/core/crud/useCrudMutations.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/data/core/crud/useListQuery.ts:8 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/data/core/crud/useListQuery.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/data/notifications/useNotificationActions.ts:11 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/data/settings/app/useAppSettingsWrite.ts:9 | NoToastInDataHooks | hooks/data imports @/lib/notify (UI side-effect) |
| hooks/page/admin/dashboard/useAggregatedAnnualReport.ts:8 | HooksLayering | hooks/page imports supabase client directly — use lib/services/* |
| hooks/page/admin/messaging/useBulkMessageSender.ts:8 | HooksLayering | hooks/page imports supabase client directly — use lib/services/* |

## Warnings (top 30)

_None._