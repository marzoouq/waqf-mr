# M6 — Integration Matrix — Forensic Audit
**Date:** 2026-06-22  
**Scope:** src/pages, src/hooks/data, supabase/functions, queryKeys, realtime

---

## 1. Page → Hook → DB → Edge Matrix

| Page | Hooks (data/) | DB Tables (inferred) | Edge Functions |
|------|--------------|----------------------|----------------|
| `dashboard/AdminDashboard.tsx` | `useDashboardSummary`, `useDashboardPrefetch` | via `dashboard-summary` edge | `dashboard-summary` |
| `dashboard/BeneficiariesPage.tsx` | `useBeneficiaries` | `beneficiaries`, `beneficiaries_safe` | — |
| `dashboard/ExpensesPage.tsx` | `useExpenses`, `useExpenseBudgets` | `expenses`, `expense_budgets` | — |
| `dashboard/IncomePage.tsx` | `useIncome` | `income` | — |
| `dashboard/ContractsPage.tsx` | `useContracts`, `useTenantPayments` | `contracts`, `tenant_payments` | — |
| `dashboard/InvoicesPage.tsx` | `useInvoices`, `usePaymentInvoices` | `invoices`, `payment_invoices` | `generate-invoice-pdf` |
| `dashboard/AccountsPage.tsx` | `useAccounts`, `useAccountCategories` | `accounts`, `account_categories` | — |
| `dashboard/DistributionsPage.tsx` | `useAdvanceRequests`, `useDistribute` | `advance_requests`, `distributions` | — |
| `dashboard/AnnualReportPage.tsx` | `useAnnualReport`, `useFiscalYears` | `annual_report_items`, `fiscal_years` | — |
| `dashboard/BylawsPage.tsx` | `useBylaws` | `waqf_bylaws` | — |
| `dashboard/AuditLogPage.tsx` | `useAuditLog`, `useAccessLogTab`, `useArchiveLog`, `useClientErrors` | `audit_log`, `access_log`, `client_errors` | — |
| `dashboard/UserManagementPage.tsx` | `useBeneficiaryUsers` (→ admin-manage-users), `useUserManagementData` | via edge | `admin-manage-users` |
| `dashboard/MessagesPage.tsx` | `useMessaging`, `useBulkMessaging` | `conversations`, `messages` | — |
| `dashboard/SupportDashboardPage.tsx` | `useSupportTickets`, `useSupportAnalytics`, `useClientErrors` | `support_tickets`, `client_errors` | — |
| `dashboard/EmailMonitorPage.tsx` | `useEmailMonitor`, `useEmailMonitorActions` | `email_send_log` | `email-admin` |
| `dashboard/ZatcaManagementPage.tsx` | `useZatcaManagement`, `useZatcaInvoiceActions`, `useZatcaOnboarding` | `zatca_certificates`, `zatca_operation_log` | `zatca-onboard`, `zatca-xml-generator`, `zatca-signer`, `zatca-report` |
| `dashboard/HistoricalComparisonPage.tsx` | `useYearComparisonData`, `useMultiYearSummary` | via edge | `year-comparison-summary`, `multi-year-summary` |
| `dashboard/SettingsPage.tsx` | `useAppSettings`, `useWaqfInfo`, `useRolePermissions` | `app_settings` | — |
| `beneficiary/BeneficiaryDashboard.tsx` | `useBeneficiaryDashboardRpc` | via RPC | — |
| `beneficiary/MySharePage.tsx` | `useAdvanceRequests`, `useMaxAdvanceAmount`, `useMyDistributions` | `advance_requests`, `distributions` | — |
| `beneficiary/InvoicesViewPage.tsx` | `usePaymentInvoices`, `useInvoices` | `invoices`, `payment_invoices` | `generate-invoice-pdf` |
| `beneficiary/NotificationsPage.tsx` | `useNotifications`, `useNotificationActions` | `notifications` | — |
| `beneficiary/BeneficiaryMessagesPage.tsx` | `useMessaging`, `useUnreadMessages` | `conversations`, `messages` | — |
| `beneficiary/CarryforwardHistoryPage.tsx` | `useAdvanceQueries` | `advance_requests` | — |
| `waqif/WaqifDashboard.tsx` | `useWaqifDashboardPage` → `useIncome`, `useExpenses`, `usePaymentInvoices` | `income`, `expenses`, `payment_invoices` | — |
| `Auth.tsx` | `useAuthPage` → `useLoginForm` | — | `guard-signup` |
| `ResetPassword.tsx` | `useResetPassword` | — | — |
| `InstallApp.tsx` | `useInstallAppPage`, `usePushNotifications` | — | — |

---

## 2. Orphan Hooks (src/hooks/data/** — dead code)

> Methodology: checked imports in `src/pages`, `src/hooks` (non-data), `src/components`, `src/contexts`.  
> All hooks below have **zero consumers** outside their own directory (excluding test files).

| Hook | File | Reason |
|------|------|--------|
| `useWholePropertyRental` | `src/hooks/data/contracts/useWholePropertyRental.ts` | Not imported anywhere in src |
| `useContractsForPdf` | `src/hooks/data/contracts/useContractsForPdf.ts` | Not imported anywhere in src |
| `usePropertyVatSync` | `src/hooks/data/properties/usePropertyVatSync.ts` | Not imported anywhere in src |
| `useTotalBeneficiaryPercentage` | `src/hooks/data/financial/dashboard/useTotalBeneficiaryPercentage.ts` | Not imported anywhere in src (only referenced in its own `.test`) |
| `useFiscalYearSummary` | `src/hooks/data/financial/fiscalYears/useFiscalYearSummary.ts` | Not imported outside hooks/data/ |
| `useAuditLogStats` | `src/hooks/data/audit/useAuditLogStats.ts` | Not imported anywhere in src |
| `useAppSettingsHistory` | `src/hooks/data/settings/app/useAppSettingsHistory.ts` | Not imported outside hooks/data/ |
| `usePushNotifications` *(partial)* | `src/hooks/data/notifications/usePushNotifications.ts` | Used in `useInstallAppPage` but the VAPID-subscribe flow is only called from `InstallApp.tsx`; the `useManagePushSubscriptions` export is unused |

---

## 3. Orphan Edge Functions (supabase/functions/ — never invoked from src)

> Methodology: exhaustive `invoke('…')` grep across all `src/**/*.ts(x)` excluding test files.  
> Invoked functions: `dashboard-summary`, `admin-manage-users`, `generate-invoice-pdf`, `generate-voucher-pdf`, `email-admin`, `year-comparison-summary`, `multi-year-summary`, `webauthn`, `zatca-onboard`, `zatca-xml-generator`, `zatca-signer`, `zatca-report`, `guard-signup`, `lookup-national-id`.

| Edge Function | Status | Notes |
|---------------|--------|-------|
| `ai-assistant` | ⚠️ **ORPHAN (partial)** | Called only via raw `fetch` URL: `${SUPABASE_URL}/functions/v1/ai-assistant` in `src/hooks/application/useAiChat.ts:12` — bypasses `invoke()`, not in the invoke graph |
| `auth-email-hook` | ✅ **Not client-invocable** | Supabase Auth webhook — server-triggered, correct |
| `beneficiary-summary` | 🔴 **ORPHAN** | No `invoke('beneficiary-summary')` found anywhere in src |
| `check-contract-expiry` | ✅ **Not client-invocable** | Cron job — server-triggered, correct |
| `health-check` | ✅ **Diagnostics only** | Called via raw `fetch` in `src/lib/diagnostics/checks/backend.ts:23` (ping test), not a functional invoke |
| `process-email-queue` | ✅ **Not client-invocable** | Cron job — server-triggered, correct |
| `zatca-renew` | ⚠️ **PARTIAL ORPHAN** | Referenced by name in `src/lib/services/zatcaService.ts:17` inside a string array (diagnostics inventory) but `invoke('zatca-renew')` is never called from client code |

---

## 4. Orphan DB Tables (not referenced in any hook)

> Note: table names are inferred from supabase `.from('…')` calls in hooks/data. Tables below appear in the system context but have no `.from()` reference in src/hooks/data/**

| Table | Last Known Reference | Risk |
|-------|---------------------|------|
| `beneficiaries_safe` | Used in `useBeneficiaries.ts` (view, not base table) | Low — it's a view |
| `email_queue` | Only referenced inside `process-email-queue` edge function; no hook reads it | Medium — queue management UI missing |
| `webauthn_credentials` | `useWebAuthnCredentials.ts` → `src/hooks/data/auth/` ✅ covered | — |
| `zatca_sandbox_certificates` | Not found in any `.from()` call in hooks — only in edge function internals | Medium |

---

## 5. Invalid / Mismatched invoke() Names

> `rg -n "invoke(" src` vs `ls supabase/functions/`

| invoked name | supabase/functions/ folder | Status |
|---|---|---|
| `dashboard-summary` | `dashboard-summary/` | ✅ Match |
| `admin-manage-users` | `admin-manage-users/` | ✅ Match |
| `generate-invoice-pdf` | `generate-invoice-pdf/` | ✅ Match |
| `generate-voucher-pdf` | `generate-voucher-pdf/` | ✅ Match |
| `email-admin` | `email-admin/` | ✅ Match |
| `year-comparison-summary` | `year-comparison-summary/` | ✅ Match |
| `multi-year-summary` | `multi-year-summary/` | ✅ Match |
| `webauthn` | `webauthn/` | ✅ Match |
| `zatca-onboard` | `zatca-onboard/` | ✅ Match |
| `zatca-xml-generator` | `zatca-xml-generator/` | ✅ Match |
| `zatca-signer` | `zatca-signer/` | ✅ Match |
| `zatca-report` | `zatca-report/` | ✅ Match |
| `guard-signup` | `guard-signup/` | ✅ Match |
| `lookup-national-id` | `lookup-national-id/` | ✅ Match |
| `beneficiary-summary` | `beneficiary-summary/` | 🔴 **Function exists, never invoked** |
| `ai-assistant` | `ai-assistant/` | ⚠️ Called via raw fetch URL, not invoke() |

**Result: 0 typo/invalid names. All invoke() strings resolve to existing folders.**

---

## 6. Query Key Duplicates (صياغات مختلفة لنفس المورد)

| Resource | Key Variant A | Key Variant B | File A | File B |
|----------|--------------|--------------|--------|--------|
| **Properties** | `'properties'` (raw string in crudFactory) | `contractsKeys.propertiesNames(ids)` | `src/hooks/data/properties/useProperties.ts` | `src/hooks/data/properties/usePropertiesMap.ts` | 
| **Beneficiaries** | `'beneficiaries'` (raw string in crudFactory) | `beneficiariesKeys.safe()` → `['beneficiaries','safe']` | `src/hooks/data/beneficiaries/useBeneficiaries.ts` | same file |
| **Invoices** | `'invoices'` (raw string in crudFactory) | `invoicesKeys.byFiscalYear(fyId)` → `['invoices','by_fiscal_year',fyId]` | `src/hooks/data/invoices/useInvoices.ts` | same file |
| **Waqf bylaws** | `'waqf_bylaws'` (raw string in crudFactory) | `contentKeys.bylaws` → `['content','bylaws']` | `src/hooks/data/content/useBylaws.ts` | same file — `invalidateQueries` uses `contentKeys.bylaws` but the CRUD list uses `'waqf_bylaws'` → **invalidation miss risk** |
| **All units** | `'all-units'` (raw string in crudFactory) | `contractsKeys.units(propertyId)` → `['contracts','units',id]` | `src/hooks/data/properties/useUnits.ts` | same file |
| **Dashboard summary** | `['dashboard-summary', fiscalYearId]` | also prefetched with same key via `useDashboardPrefetch` | `src/hooks/data/financial/dashboard/useDashboardSummary.ts:24` | `src/hooks/data/dashboard/useDashboardPrefetch.ts` | ✅ aligned via `dashboardKeys` |
| **Notifications** | `notificationsKeys.byUser(userId)` | `['notifications']` (raw) in `useNotifications.ts` | `src/hooks/data/notifications/useNotifications.ts` | same file |

### Critical finding
> `useBylaws.ts`: the CRUD factory registers key `'waqf_bylaws'` but `invalidateQueries` uses `contentKeys.bylaws` = `['content','bylaws']`. These are **different top-level keys** → mutations will NOT invalidate the list query.  
> **File:** `src/hooks/data/content/useBylaws.ts`

---

## 7. Realtime Leaks (.channel/.subscribe without cleanup)

> Methodology: traced all `.channel(` calls → all route through `src/lib/realtime/channelFactory.ts:7` (`createRealtimeChannel`) → consumed exclusively by `useBfcacheSafeChannel` (`src/lib/realtime/bfcacheSafeChannel.ts`).

### `useBfcacheSafeChannel` cleanup audit

| Cleanup mechanism | Present? | Location |
|---|---|---|
| `removeRealtimeChannel(channelRef.current)` on unmount | ✅ Yes | `bfcacheSafeChannel.ts:teardown()` |
| `pagehide` → `teardown()` | ✅ Yes | `bfcacheSafeChannel.ts:167` |
| `pageshow` (bfcache restore) re-init | ✅ Yes | `bfcacheSafeChannel.ts` |
| Auth subscription `unsubscribe()` in cleanup | ✅ Yes | `bfcacheSafeChannel.ts:167` |
| `clearTimeout(retryRef.current)` on unmount | ✅ Yes | `clearRetry()` called in teardown |
| `debounce timer` (`timerRef`) in `useDashboardRealtime` | ✅ Yes | `useDashboardRealtime.ts:47-49` |

**Result: No realtime leaks detected.** All `.channel()` calls are gated through `useBfcacheSafeChannel` which implements a complete teardown lifecycle. The `removeStaleScopedChannels` helper also cleans up any orphaned channel references from previous renders.

### Direct `.subscribe()` calls (outside channel factory)

| Location | Type | Cleanup |
|---|---|---|
| `src/hooks/auth/session/useAuthListener.ts:162` | `supabase.auth.onAuthStateChange` subscription | ✅ `subscription.unsubscribe()` in return |
| `src/hooks/auth/flows/useResetPassword.ts:40` | `supabase.auth.onAuthStateChange` | ✅ `return () => subscription.unsubscribe()` |

**No leaks found.**

---

## Summary Table

| Category | Count | Severity |
|---|---|---|
| Orphan hooks (dead code) | **7–8** | Low–Medium |
| Orphan edge functions (never invoked) | **1 confirmed** (`beneficiary-summary`), **1 partial** (`zatca-renew`) | Medium |
| Invalid invoke() names | **0** | — |
| Query key duplicates / drift | **5 raw-string duplicates**, **1 critical invalidation miss** (`waqf_bylaws`) | 🔴 High (bylaws), Low (others) |
| Realtime leaks | **0** | — |

---

*Generated by forensic audit — no code was modified.*
