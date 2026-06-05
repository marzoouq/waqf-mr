# Conventions Deep Report

Total violations: **29** (Critical: 7, Warning: 10, Info: 12)

## By rule

| Rule | Count |
|---|---:|
| NoConsole | 10 |
| HookSize | 7 |
| HexColors | 4 |
| CoreModV7 | 4 |
| NoToastInDataHooks | 3 |
| ComponentSize | 1 |

## Critical violations

| File:Line | Rule | Message |
|---|---|---|
| hooks/data/core/useCrudFactory.test.ts:31 | NoToastInDataHooks | hooks/data imports sonner |
| hooks/data/financial/accounts/useAccounts.test.ts:31 | NoToastInDataHooks | hooks/data imports sonner |
| hooks/data/notifications/useNotificationActions.test.ts:8 | NoToastInDataHooks | hooks/data imports sonner |
| pages/Auth.tsx:7 | CoreModV7 | page imports from hooks/data/* directly |
| pages/PublicPages.test.tsx:54 | CoreModV7 | page imports from hooks/data/* directly |
| pages/beneficiary/BeneficiaryDashboard.tsx:6 | CoreModV7 | page imports from hooks/data/* directly |
| pages/dashboard/AnnualReportPage.tsx:25 | CoreModV7 | page imports from hooks/data/* directly |

## Warnings (top 30)

| File:Line | Rule | Message |
|---|---|---|
| components/common/ErrorBoundary.test.tsx:7 | NoConsole | console.error |
| components/common/ErrorBoundary.test.tsx:12 | NoConsole | console.error |
| routes/RouteErrorBoundary.test.tsx:16 | NoConsole | console.error |
| routes/RouteErrorBoundary.test.tsx:17 | NoConsole | console.error |
| routes/RouteErrorBoundary.test.tsx:19 | NoConsole | console.error |
| routes/RouteErrorBoundary.test.tsx:22 | NoConsole | console.error |
| test/setup.ts:19 | NoConsole | console.warn |
| test/setup.ts:20 | NoConsole | console.warn |
| test/setup.ts:22 | NoConsole | console.error |
| test/setup.ts:23 | NoConsole | console.error |