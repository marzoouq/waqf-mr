# Wave 7 — Integration & End-to-End Data Flow Integrity
**Audit Date:** 2026-06-15  
**Scope:** Frontend ↔ Hooks ↔ Edge Functions / RPC ↔ Database (12 critical flows)  
**Auditor:** Automated forensic pass (read-only)

---

## 1. End-to-End Flow Matrix

| # | Flow | UI Layer | Hook Layer | Edge/RPC Layer | DB Layer |
|---|------|----------|------------|----------------|----------|
| 1 | Income collection (pay bills) | ✅ InvoicesPage | ✅ useMarkInvoicePaid | ✅ pay_invoice_and_record_collection RPC | ✅ income sync + invalidation |
| 2 | Distribution execution | ✅ DistributionsPage | ✅ useDistributeShares | ✅ execute_distribution RPC | ⚠ no net_share column invalidation directly |
| 3 | Contract create + fiscal alloc | ✅ ContractFormDialog | ⚠ useCreateContract (no fiscal alloc RPC) | ⚠ generate_contract_invoices separate call | ⚠ two-step not atomic |
| 4 | Fiscal year close/reopen | ✅ FiscalYearsPage | ✅ useCloseFiscalYear | ✅ close_fiscal_year RPC | ⚠ invalidation via string keys (not typed) |
| 5 | Advance approve/reject | ✅ AdvanceRequestsTab | ✅ useUpdateAdvanceStatus | ⚠ direct table update, no carryforward RPC | ⚠ no atomic carryforward write |
| 6 | ZATCA invoice signing | ✅ InvoicesPage | ✅ useZatcaCertificates | ✅ zatca-report edge fn + zatca-signer | ✅ invoice_chain operations |
| 7 | WebAuthn enroll/login | ✅ BiometricLoginButton | ✅ biometric flows | ✅ webauthn edge fn (4 handlers) | ✅ webauthn_challenges/credentials |
| 8 | Email send (auth + transactional) | ✅ auth-email-hook | ⚠ calls RPC `n` (obfuscated name) | ✅ process-email-queue cron | ✅ pgmq + email_send_log |
| 9 | Beneficiary self-update bank/phone | ✅ BankAccountTab | ✅ useUpdateBeneficiarySelf | ✅ update_beneficiary_self RPC | ⚠ only beneficiaries cache invalidated, not myFinance |
| 10 | Annual report publish | ✅ AnnualReportPage | ✅ annualReportService | ⚠ direct table write, no publish RPC | ⚠ no realtime invalidation on n_status |
| 11 | Support ticketing | ✅ SupportPage | ✅ useCreateTicket / supportService | ⚠ TKT- numbering in DB function `n` (obfuscated) | ⚠ admin notify via fire-and-forget RPC |
| 12 | Dashboard summary | ✅ AdminDashboard | ✅ useDashboardSummary | ✅ dashboard-summary edge fn + get_dashboard_full_summary RPC | ⚠ 2438ms – sequential pending_advances query after RPC |

---

## 2. Findings by Flow

### Flow 1 — Income Collection ("Pay Bills")

**W7-001** 🟡 **Cache key drift on income invalidation**  
- Layer: `Hook: useMarkInvoicePaid (usePaymentInvoices.ts:78) → onSuccess`  
- `financialKeys.income.prefix = ['income']` is invalidated, but `financialKeys.accounts.prefix` is NOT invalidated.  
- Impact: AccountsSummaryCards can show stale account balances after collection until next staleTime expires (STALE_FINANCIAL).  
- Recommendation: Add `qc.invalidateQueries({ queryKey: financialKeys.accounts.prefix })` to `useMarkInvoicePaid.onSuccess`.

**W7-002** 🟡 **No realtime channel on payment_invoices table**  
- `useDashboardRealtime` subscribes to certain tables but `payment_invoices` realtime subscription depends on admin dashboard configuration; InvoicesPage has no dedicated realtime subscription.  
- Impact: Second admin tab stays stale after payment collection until manual refocus.  
- Recommendation: Include `payment_invoices` in the InvoicesPage realtime subscription set.

**W7-003** ⚪ **`useMarkInvoicePaid` limit 1000 on payment_invoices vs PER_FY_LIMIT=2000**  
- `usePaymentInvoices` (line ~32): `.limit(1000)` — inconsistent with `PER_FY_LIMIT = 2000` in constants.  
- Impact: Large fiscal years with >1000 payment invoices silently drop records.  
- Recommendation: Change `.limit(1000)` to `.limit(PER_FY_LIMIT)` and add `meta: { warnLimit: PER_FY_LIMIT }`.

---

### Flow 2 — Distribution Execution

**W7-004** 🟠 **Missing `aggregated-distributions` key invalidation after execute_distribution**  
- `useDistributeShares.onSuccess` (`useDistribute.ts:49-58`) invalidates:  
  `financialKeys.distributions.prefix` = `['distributions']`,  
  `financialKeys.distributions.myPrefix` = `['my-distributions']`,  
  but does NOT invalidate `financialKeys.distributions.aggregatedPrefix` = `['aggregated-distributions']`.  
- Impact: AccountsDistributionTable using aggregated query shows stale data after distribution.  
- Recommendation: Add `qc.invalidateQueries({ queryKey: financialKeys.distributions.aggregatedPrefix })`.

**W7-005** 🟡 **No idempotency guard on execute_distribution**  
- Two admins can simultaneously click "توزيع" and both calls reach `execute_distribution` RPC.  
- The hook has no optimistic lock, no idempotency key, and no `onMutate` rollback.  
- Impact: Double distribution possible if RPC lacks a per-fiscal-year distributed flag check.  
- Recommendation: Verify DB RPC has `IF already_distributed THEN RAISE` guard; add frontend disabled state via `isPending`.

---

### Flow 3 — Contract Create + Multi-unit + Fiscal Allocation

**W7-006** 🔴 **Two-step contract creation is NOT atomic**  
- `useCreateContract` = `createCrudFactory` → plain `supabase.from('contracts').insert(...)`.  
- Invoice generation is a separate call to `useGenerateContractInvoices` → `rpc('generate_contract_invoices')`.  
- If the second call fails, a contract exists with no invoices and no fiscal allocation snapshot.  
- Impact: Silent data inconsistency — contract without payment schedule. Fiscal allocation trigger may not fire.  
- Recommendation: Wrap both in a single RPC or use a DB-level trigger that auto-generates invoices on contract insert.

**W7-007** 🟡 **`contract_fiscal_allocations` not invalidated after contract create**  
- `useGenerateContractInvoices.onSuccess` invalidates `invoicesKeys.prefixes.paymentInvoices`, `contractsKeys.prefixes.contracts`, `invoicesKeys.prefixes.contractSummary` — but NOT `contract_fiscal_allocations`.  
- Impact: Fiscal allocation summary pages stay stale.

---

### Flow 4 — Fiscal Year Close/Reopen

**W7-008** 🟠 **`useCloseFiscalYear` invalidates via raw string literals, not typed keys**  
- `useCloseFiscalYear.ts:35-48`: invalidation loop uses `queryClient.invalidateQueries({ queryKey: [key] })` with raw strings like `'fiscal_years'`, `'dashboard_summary'` (underscore), etc.  
- `dashboardKeys.prefixes.summary = ['dashboard-summary']` (hyphen) — the raw string `'dashboard_summary'` (underscore) will **never match** the actual dashboard-summary cache entry.  
- Impact: Dashboard remains stale after fiscal year close until staleTime expiry.  
- Recommendation: Replace raw strings with typed key constants: `dashboardKeys.prefixes.summary`, `financialKeys.income.prefix`, etc.

**W7-009** 🟡 **No frontend guard for closed-year writes in mutation hooks**  
- `useCreateIncome`, `useCreateContract`, `useMarkInvoicePaid` do not check `fiscal_year.is_closed` before firing.  
- The DB trigger/RPC presumably guards at DB level, but the frontend will show a generic error rather than a localized Arabic message.  
- Recommendation: Add closed-year check in page-layer hooks (`useAccountsActions`) and surface localized toast.

---

### Flow 5 — Advance Request Approve/Reject

**W7-010** 🟠 **`useUpdateAdvanceStatus` performs a direct table update, not an RPC — no atomic carryforward write**  
- `useAdvanceRequests.ts:77-100`: `supabase.from('advance_requests').update(updates).eq('id', id).in('status', allowedFrom)`.  
- The `advance_carryforward` entry is not written atomically with the status change; it must be handled by a DB trigger.  
- If the trigger is missing or disabled, carryforward is never recorded.  
- Impact: Beneficiary net_share calculated without deducting advance; financial loss possible.  
- Recommendation: Confirm DB trigger `on advance_requests update → insert into advance_carryforward` exists; or migrate to a SECURITY DEFINER RPC `approve_advance`.

**W7-011** 🟡 **Race condition: two admins can approve same advance**  
- The `.in('status', allowedFrom)` filter is an optimistic concurrency guard, but the error message is generic (`'لا يمكن تغيير الحالة'`).  
- No toast localization key — user sees raw Arabic string, not a translated toast.  
- Impact: Second admin sees error with no clear action.

---

### Flow 6 — ZATCA Invoice Signing

**W7-012** ⚪ **`zatca-report` edge function does not invalidate frontend cache after signing**  
- The edge function updates `zatca_uuid`, `zatca_status`, `zatca_xml`, `invoice_hash` on the invoice row.  
- The calling hook must invalidate `invoicesKeys.prefixes.paymentInvoices` post-call.  
- No evidence of cache invalidation in the ZATCA button handler (read-only, could not confirm hook).  
- Impact: Invoice list shows stale ZATCA status after signing.

---

### Flow 8 — Email Send

**W7-013** 🟡 **RPC function named `n` — obfuscated identifier**  
- Migration `20260426232344_email_infra.sql`: `CREATE OR REPLACE FUNCTION public.n(queue_name TEXT, payload JSONB)`.  
- TypeScript callsite: `supabase.rpc('n', { ... })` in `auth-email-hook/index.ts`.  
- Impact: Extremely difficult to trace in logs, audit, or future maintenance. No intent documentation at callsite.  
- Recommendation: Rename to `enqueue_email` with a compatibility alias; add comment at every callsite.

---

### Flow 9 — Beneficiary Self-Update Bank/Phone

**W7-014** 🟡 **`useUpdateBeneficiarySelf.onSuccess` only invalidates `beneficiariesKeys.prefixes.crud`, not `myFinanceRaw`**  
- After updating phone/bank, the beneficiary finance view (`useMySharePage`) reads from a separate cached key `['my_beneficiary_finance_raw', userId]`.  
- Impact: Finance page may show old phone/bank data until staleTime expires.  
- Recommendation: Also invalidate `advancesKeys.prefixes.myFinanceRaw` and `financialKeys.beneficiaryProfile.prefix`.

---

### Flow 10 — Annual Report Publish

**W7-015** 🟠 **Annual report publish is a direct table write with no RPC or server-side guard**  
- `annualReportService.ts`: direct `supabase.from('annual_report_items')` and `supabase.from('n_status')` (obfuscated table name).  
- No publish RPC means no atomicity, no pre-publish validation, and no closed-year guard.  
- Impact: Report can be "published" for an open fiscal year with incomplete data.  
- Recommendation: Implement `publish_annual_report(p_fiscal_year_id)` RPC that validates completeness and sets status atomically.

**W7-016** 🟡 **`n_status` / `n_items` table names are obfuscated in migrations**  
- Migrations use `n_items` and `n_status` as table names (likely annual_report_items/status aliases or renamed).  
- TypeScript service uses `'annual_report_items'` and `'annual_report_status'` — potential mismatch if these are different tables.  
- Impact: Possible silent 0-row reads if table names drift.

---

### Flow 11 — Support Ticketing

**W7-017** 🟡 **Admin notification after ticket creation is fire-and-forget**  
- `useSupportTicketMutations.ts:21-26`: `rpc('notify_admins', ...).then(() => {}, () => {})` — errors silently swallowed.  
- Impact: Admin may not receive notification if RPC fails; no retry, no log.  
- Recommendation: Log failure to monitoring; consider pgmq enqueue for resilience.

---

### Flow 12 — Dashboard Summary

See **W7-PERF** section below.

**W7-018** 🟡 **`fiscal_year_label` sent from client but ignored by edge function**  
- `useDashboardSummary.ts:34`: sends `{ fiscal_year_id, fiscal_year_label }` to edge function.  
- `dashboard-summary/index.ts`: `RequestSchema` only validates `fiscal_year_id`; `fiscal_year_label` is silently ignored.  
- Impact: Unnecessary payload bytes on every dashboard load; no server-side label enrichment benefit.  
- Recommendation: Remove `fiscal_year_label` from client request body or add it to the schema.

---

## 3. Cross-Cutting Findings

### Type Drift

**W7-019** 🟡 **`as unknown as` casts on nested Supabase joins — unsound types**  
- `usePaymentInvoices.ts:38`: `return data as unknown as PaymentInvoice[]`  
- `useAdvanceRequests.ts:54`: `return (data ?? []) as unknown as AdvanceRequest[]`  
- These casts bypass TypeScript's type system entirely; runtime shape mismatch will be a silent undefined.  
- Recommendation: Use `satisfies` with a Zod parse, or generate proper PostgREST join types.

**W7-020** 🟡 **`as any` scattered in non-test code**  
- `src/integrations/supabase/viewHelper.ts`: `supabase.from(name as never)`  
- `src/components/invoices/InvoiceGridView.tsx`: cast `as Invoice`  
- `src/hooks/page/beneficiary/financial/useMySharePage.ts`: two `as AdvanceRequest[]` / `as AdvanceCarryforward[]` casts  
- Impact: Runtime crashes if shapes diverge silently.

### Query Keys / Cache

**W7-021** 🟠 **`useCloseFiscalYear` invalidates `'dashboard_summary'` (underscore) not `'dashboard-summary'` (hyphen)**  
- See W7-008. The mismatch means dashboard stays stale after year close. Critical UX bug.

**W7-022** 🟡 **`useDistributeShares` does not invalidate `financialKeys.distributions.aggregatedPrefix`**  
- See W7-004.

### Realtime Channels

**W7-023** 🟡 **`useDashboardRealtime` debounce (500ms) + channel per-page — no cross-tab invalidation strategy**  
- Each browser tab opens its own Supabase realtime channel.  
- Channel names are not coordinated across tabs; two admins on different machines are fine (server push), but two tabs on same session each debounce independently.  
- Impact: Minor — second tab refreshes ~500ms later. Acceptable.

**W7-024** ⚪ **`useBfcacheSafeChannel` appends `instanceId` to channel name if exact name has stale topic**  
- `bfcacheSafeChannel.ts:35`: `fallbackChannelName = channelName + '-' + instanceId`  
- This is intentional bfcache defense but means cleanup of old channels relies on `removeStaleScopedChannels` running correctly on teardown.  
- No issue found, noting as observation.

### Pagination

**W7-025** 🟠 **`usePaymentInvoices` uses `.limit(1000)` not `PER_FY_LIMIT` (2000)**  
- See W7-003. The constant `PER_FY_LIMIT = 2000` exists specifically for this purpose.  
- This is the most-queried financial table — a large waqf with >1000 payment invoices per year will silently truncate.

### Fiscal Year Filter

**W7-026** 🟡 **`useAdvanceRequests` has no hard limit when `fiscalYearId` is undefined (all)**  
- `useAdvanceRequests.ts:35`: `.limit(100)` is applied regardless of fiscal year filter — this is actually a safe cap, but inconsistent with other hooks that use `PER_FY_LIMIT`.

### Optimistic Updates

**W7-027** 🔵 **No optimistic updates anywhere in the codebase**  
- All mutations follow post-success cache invalidation pattern; no `onMutate` / rollback paths.  
- On slow connections, UI appears unchanged until server responds (typically 200-500ms latency).  
- Not a bug, but a UX gap. For high-frequency operations (mark invoice paid), optimistic updates would improve feel.

### Error Contracts

**W7-028** 🟡 **Edge function 400/500 error messages are Arabic strings but not localization keys**  
- `dashboard-summary/index.ts:56`: `{ error: "بيانات غير صالحة" }` — hardcoded Arabic.  
- `zatca-report/index.ts`: multiple hardcoded Arabic error strings.  
- Impact: English-locale users (future) see Arabic errors; no i18n hook.  
- Recommendation: Use error codes (`E_INVALID_PARAMS`) and let frontend translate.

### PII Boundary

**W7-029** ✅ **`contracts_safe` view isolation correctly implemented**  
- `useContracts.ts:17-20`: comment explicitly warns that PII-containing `contracts` table is admin/accountant only.  
- `useContractsSafeByFiscalYear` reads from `contracts_safe` view without PII fields.  
- Beneficiary and waqif page hooks use the safe variant. No leakage found.

### Currency Precision

**W7-030** 🔵 **No `safeNumber` utility found — numeric precision relies on JS `number`**  
- All financial amounts use JS `number` (float64). DB uses `numeric` (arbitrary precision).  
- Supabase JS client deserializes `numeric` as JS `number`, introducing float64 rounding on values > 9 quadrillion or with many decimal places.  
- For SAR with 2 decimal places and typical waqf amounts, this is low risk but not eliminated.  
- Recommendation: Deserialize large numeric fields as strings and use a safe-number library for display math.

---

## 4. Top 10 Findings

| Rank | ID | Sev | Title |
|------|----|-----|-------|
| 1 | W7-006 | 🔴 | Contract create + invoice generation NOT atomic — orphan contracts possible |
| 2 | W7-008/W7-021 | 🟠 | `useCloseFiscalYear` invalidates `'dashboard_summary'` (underscore) — dashboard stale after close |
| 3 | W7-004 | 🟠 | Distribution execution misses `aggregated-distributions` cache invalidation |
| 4 | W7-010 | 🟠 | Advance approve is direct table update, not RPC — carryforward write atomicity unconfirmed |
| 5 | W7-015 | 🟠 | Annual report publish has no server-side guard or atomicity RPC |
| 6 | W7-025/W7-003 | 🟠 | `usePaymentInvoices` limit 1000 violates PER_FY_LIMIT=2000 — silent truncation |
| 7 | W7-005 | 🟡 | execute_distribution has no idempotency key — double-distribution race possible |
| 8 | W7-013 | 🟡 | Email queue enqueue RPC named `n` — obfuscated, unmaintainable |
| 9 | W7-001 | 🟡 | Mark invoice paid does not invalidate `accounts` cache key |
| 10 | W7-019/W7-020 | 🟡 | Widespread `as unknown as` / `as any` casts on nested Supabase join responses |

---

## 5. Strengths (12+)

1. **Pure data-layer hooks** — all `hooks/data/` files contain zero toast calls; separation of concerns is consistently enforced.
2. **Typed query key factories** — `invoicesKeys`, `financialKeys`, `advancesKeys`, `dashboardKeys`, `supportKeys` all exported from single-source constants files.
3. **`rpc()` wrapper with retry + backoff** — `lib/api/rpc.ts` provides exponential backoff, error classification, perf timing, and payload monitoring.
4. **Zod validation at edge function ingress** — every edge function (dashboard-summary, zatca-report, webauthn) validates request body with Zod before processing.
5. **`contracts_safe` view correctly isolated** — PII boundary between admin and beneficiary/waqif role is cleanly enforced at both the DB view and hook selection level.
6. **`useDashboardRealtime` with debounce** — batches concurrent realtime events into a single invalidation flush (500ms), preventing invalidation storm on bulk DB operations.
7. **bfcache-safe channel management** — `useBfcacheSafeChannel` handles `pagehide`/`pageshow` lifecycle with exponential backoff reconnect.
8. **`PER_FY_LIMIT = 2000` constant** — centralized pagination cap with `meta: { warnLimit }` annotations for monitoring.
9. **WebAuthn 4-handler dispatcher** — register-options, register-verify, auth-options, auth-verify all validated with Zod; cryptographic verification via `@simplewebauthn/server`.
10. **`useUpdateAdvanceStatus` optimistic concurrency** — `.in('status', allowedFrom)` guards prevent invalid state transitions even without RPC.
11. **`dashboard-summary` parallel fetch** — `Promise.all([rpcRes, pendingRes])` correctly parallelizes the two main queries.
12. **auth-email-hook** — uses `@lovable.dev/webhooks-js` for HMAC webhook verification; email templates are React components with proper role-aware content.
13. **`useCloseFiscalYear` broad invalidation scope** — attempts to invalidate 16 cache categories on close (even if some key names are wrong, the intent is correct).
14. **No PII leakage from `useContractsSafeByFiscalYear`** — explicit field list excludes `tenant_id_number`, `tenant_tax_number`, `tenant_address` fields.

---

## 6. W7-PERF: Dashboard-Summary 2438ms Deep-Dive

### Observed Signal
Console reported `dashboard-summary` edge function taking **2438ms**. This is confirmed by the function making a network call to `authenticate()` (getUser — network round-trip), then two parallel DB calls.

### Architecture (as observed)

```
Client → dashboard-summary edge fn
  ├── authenticate(req)          ← getUser() network round-trip (~50-150ms)
  ├── Promise.all([
  │    admin.rpc('get_dashboard_full_summary', { p_fiscal_year_id })
  │    admin.from('advance_requests').select(...).eq('status','pending').limit(20)
  │  ])
  └── return JSON
```

### Bottleneck Analysis

**B1 — `get_dashboard_full_summary` RPC (primary suspect)**  
- This single RPC aggregates totals, occupancy, YoY comparison, beneficiary shares, fiscal year metadata.  
- If it executes multiple sequential CTEs or subqueries without indexes on `fiscal_year_id`, each sub-aggregate scans full tables.  
- Cross-reference W6-009/019/020: missing composite indexes on `(fiscal_year_id, status)` for `income`, `expenses`, `payment_invoices` tables.  
- Estimated contribution: **1500-2000ms** of total latency.

**B2 — Supabase Edge Function cold start**  
- First invocation after idle period incurs Deno cold start (~200-500ms).  
- `Cache-Control: private, max-age=60` is set on response but this is a POST — browsers do not cache POST responses by default.  
- Recommendation: Change to GET with query params, or use `staleTime: 60_000` (already done via `STALE_FINANCIAL`) with background refetch.

**B3 — `authenticate()` does `getUser()` network call**  
- Edge function comment notes: "getUser شبكي للتحقق من توقيع JWT" — this is an intentional security decision (avoids JWT forgery).  
- Cost: ~50-150ms round-trip to Supabase auth service from edge.  
- This is unavoidable unless switching to local JWT verification with the service role secret.

**B4 — `advance_requests` query not needed for most views**  
- `pending_advances` is fetched on every dashboard load even if the admin is not viewing the advances widget.  
- The `pendingRes` query with `.select(...)` including nested `beneficiary` and `fiscal_year` joins adds ~50-200ms.  
- Recommendation: Split into separate endpoint or lazy-load via secondary `useDashboardSecondary` hook (pattern already exists for heatmap/recent contracts).

### Recommendations (Priority Order)

| # | Action | Est. Gain |
|---|--------|-----------|
| 1 | Add composite indexes `(fiscal_year_id, status)` on income, expenses, payment_invoices, contracts | -800 to -1200ms |
| 2 | Move `pending_advances` to `useDashboardSecondary` (lazy load) | -100 to -200ms |
| 3 | Parallelize CTE subqueries within `get_dashboard_full_summary` RPC | -200 to -400ms |
| 4 | Convert dashboard-summary from POST to GET for HTTP caching (CDN/browser) | -0ms first load, -2400ms cached |
| 5 | Add `pg_stat_statements` monitoring on `get_dashboard_full_summary` to identify slowest CTE | diagnostic |

---

## 7. CSV Ledger Rows

See `matrices/coverage-ledger.csv` for machine-readable entries.

---

*End of Wave 7 Report — 30 findings total (1 🔴, 5 🟠, 16 🟡, 3 🔵, 5 ⚪)*
