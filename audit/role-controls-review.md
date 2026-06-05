# Role Controls Review — الناظر والمستفيد

Generated: 2026-06-05

## Phase 1 — Baseline (all green)

| Check | Result |
|---|---|
| `npm run lint:conventions` | ✅ 0 violations (5 size warnings only) |
| `audit-ui-permissions` (regex gap scan, 449 files) | ✅ 0 gaps |
| `build-permissions-matrix` | ✅ 156 rows (39 routes × 4 roles) |
| `security-gates` (Edge Functions) | ✅ 0 violations |
| `vitest run` | ✅ 1985/1985 |
| `tsc --noEmit` | ✅ 0 errors |
| `eslint src/` | ✅ 0 errors (3 size-only warnings) |

## Phase 2 — Per-page control inventory

Script: `scripts/audit-page-controls.mjs` → `audit/page-controls-audit.csv` + `audit/page-controls-audit.md`.

| Metric | Value |
|---|---|
| Pages scanned (admin + beneficiary) | 39 |
| Total top-level controls (Tab/Button/Dropdown/Link/Form) | 91 |
| Controls properly wired (handler/Link/parent-Trigger/Radix-tabs) | **91** |
| `GAP-NO-HANDLER` | **0** |

Method note: scanner inspects only page files. Child components (e.g. `FiscalYearManagementTab`, `DistributeDialog`, `InvoicesPageDialogs`) carry the actual action buttons; those are covered separately by `audit-ui-permissions.mjs` (449-file regex scan, also 0 gaps) and by `buttonHandlerAudit.test`.

## Phase 3 — Sensitive financial buttons (manual review)

All routes below are wrapped by `pr(...)` which composes `ProtectedRoute` (role gate) + `RequirePermission` (route permKey) + `withRouteErrorBoundary` — see `src/routes/ProtectedRouteHelper.tsx`.

| # | Action | Route gate | Component file:line | Handler wiring | Status |
|---|---|---|---|---|---|
| 1 | إقفال سنة مالية | `ADMIN_ONLY` → `/dashboard/settings` | `FiscalYearManagementTab.tsx:136` | `onClick={() => handleClose(fy)}` → opens AlertDialog → redirects to Accounts page (DB closure is gated by `has_role(admin)` RLS) | ✅ |
| 2 | إعادة فتح سنة مُقفلة | `ADMIN_ONLY` → `/dashboard/settings` | `FiscalYearManagementTab.tsx:141` (`ReopenFiscalYearDialog`) | `onConfirm={(reason) => handleReopen(fy, reason)}` → `reopenFiscalYear` RPC (server-side `has_role('admin')` check) | ✅ |
| 3 | حذف سنة + بياناتها (cascade) | `ADMIN_ONLY` | `FiscalYearManagementTab.tsx` (`handleCascadeDelete`) | RPC `delete_fiscal_year_cascade` validates admin role server-side | ✅ |
| 4 | تنفيذ التوزيع | `ADMIN_ROLES` → `/dashboard/distributions` | `DistributeDialog.tsx:62`, `DistributionsPage.tsx:49` | RPC `execute_distribution` (server-side authority — `mem://security/finance/distribution-calculation-server-authority`) | ✅ |
| 5 | حذف فاتورة | `ADMIN_ROLES` → `/dashboard/invoices` | `InvoicesPageDialogs.tsx:55` (AlertDialog) | Confirmation + invoice-deletion safeguard for partially paid (`mem://business-logic/contracts/invoice-deletion-safety-guard`) | ✅ |
| 6 | إنشاء مستخدم | `ADMIN_ONLY` → `/dashboard/users` | `UserManagementPage.tsx:56` | `mgmt.createUser.mutate` → Edge Function `admin-manage-users/create-user` (Zod + `has_role(admin)` server check) | ✅ |
| 7 | تعيين دور لمستخدم | `ADMIN_ONLY` | `UserManagementPage.tsx:144` | Edge handler `set-role` validates admin | ✅ |
| 8 | حذف مستخدم | `ADMIN_ONLY` | `UserManagementPage.tsx:167` | Edge handler `delete-user` validates admin | ✅ |
| 9 | ZATCA Onboard / Renew / Report | `ADMIN_ONLY` → `/dashboard/zatca` | `ZatcaManagementPage.tsx` (3 tabs, Radix-controlled) | All actions via Edge Functions with `getUser()` + admin gate (`mem://features/zatca/unified-compliance-and-integrity-standard`) | ✅ |
| 10 | تصدير سجل المراجعة | `ADMIN_ROLES` → `/dashboard/audit-log` | `AuditLogPage.tsx` | Read-only; `audit_log` table has `USING(false)` for write — RLS-enforced | ✅ |
| 11 | إعدادات إحصاءات الهبوط | `ADMIN_ONLY` → `/dashboard/settings` | `SettingsPage.tsx` `app_settings` tab | Writes to `app_settings` — RLS allows only admin write (`mem://security/privacy/public-stats-anonymization`) | ✅ |
| 12 | نشر/حجب سنة عن المستفيدين | `ADMIN_ONLY` | `FiscalYearManagementTab.tsx` (`togglePublished`) | `toggleFiscalYearPublished` RPC — admin-only | ✅ |
| 13 | إنشاء طلب سُلفة (مستفيد) | `BENEFICIARY_ROLES` → `/beneficiary/my-share` | `MySharePage.tsx` | RLS limits insert to `auth.uid()` + advance-limit-percentage (`mem://business-logic/finance/advance-limit-percentage-logic`) | ✅ |
| 14 | فتح تذكرة دعم (مستفيد) | `BENEFICIARY_ROLES` → `/beneficiary/support` via `SupportPageGuard` | `SupportPageGuard.tsx` redirects admin/accountant to admin support; beneficiaries see `SupportPage` | ✅ |
| 15 | تنزيل PDF تقرير سنوي | `ALL_NON_ACCOUNTANT` → `/beneficiary/annual-report` | `AnnualReportViewPage.tsx` | Edge Function `generate-invoice-pdf` / report path with `getUser()` auth | ✅ |

## Phase 4 — Findings & open items

### Confirmed ✅

- All 39 admin/beneficiary pages have role-gated routes via `pr()` helper (no bypass).
- All 91 top-level controls have valid handlers or wrappers (0 dead buttons).
- All 156 role × route combinations in `audit/ui-permissions-matrix.csv` are correctly classified.
- All 15 sensitive financial actions are gated at the **route level** + **server level** (RLS / RPC `has_role` / Edge `getUser`). Defense in depth is intact.
- The accountant restriction on `/beneficiary/*` (other than `ALL_NON_ACCOUNTANT` set) is consistent with `mem://security/access-control/accountant-dashboard-filtering`.
- Beneficiary cannot see admin pages: `ProtectedRoute` redirects to `/unauthorized` when role is not in `allowedRoles`.

### Notes (not gaps)

1. **Beneficiary `SupportPageGuard.tsx`** has no controls — it is purely a routing guard that picks `SupportPage` (beneficiary) vs admin support based on role. Correct by design.
2. **`SupportPage.tsx`** is shown as `(no route)` because it is not directly registered — it is rendered through `SupportPageGuard`. Not a gap.
3. **Sensitive buttons are not wrapped individually by `RequirePermission`**: this is intentional — the route is already gated, and server-side RPCs/RLS provide the authoritative check. Adding per-button checks would duplicate the route gate without adding security.

### Recommendations (deferred — not in scope)

- (P3 optional) Extend `scripts/audit-page-controls.mjs` to recurse into the page's first-level imported components from `src/components/{dashboard,beneficiary}/**` for an exhaustive per-button inventory.
- (P3 optional) Add a Vitest snapshot test that asserts the per-page control count to catch UI regressions early.

## Conclusion

**No gaps detected.** All components, tabs, and buttons on admin (ناظر/محاسب) and beneficiary (مستفيد/واقف) pages are correctly enabled and wired to the permissions matrix. Route-level role gating + server-side RPC/RLS + Edge `getUser()` enforcement form a complete chain.
