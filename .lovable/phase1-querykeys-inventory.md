# المرحلة 1 — مركزة `queryKeys`: الجردة وخطة التجزئة

> مستند مرجعي. لم يُعدَّل أي ملف في الكود بعدُ.

## 1. الأرقام الكاشفة

| المؤشر | القيمة |
|---|---|
| ملفات `hooks/data/` تحتوي `queryKey` | **52** |
| تعريفات `queryKey` المباشرة | **146** |
| مفاتيح فريدة (أول عنصر) | **67** |
| مواضع `invalidateQueries` | **36** (21 في `hooks/data` + 15 في `hooks/page` و `auth`) |
| ملف مركزي موجود حالياً | `lib/queryKeys/dashboardKeys.ts` فقط |

### المخاطر الحقيقية المُلتقَطة (Cross-file invalidation — حيث يكسر أي خطأ كتابي التزامن)

| المفتاح | المُنتج (hooks/data) | المُلغي من خارج | عدد المواضع |
|---|---|---|---|
| `app-settings` / `app-settings-all` | `settings/app/*` + `settings/waqf/useWaqfInfo` | `useWaqfInfoSave`, `useLogoUpload`, `useZatcaForm`, `useZatcaCompliance` | **6** |
| `fiscal_years` | `financial/fiscalYears/useFiscalYears` | `useFiscalYearManagement` | **4** |
| `zatca-certificates` + `zatca-operation-log` | `zatca/*` | `useZatcaCompliance` | **5** |
| `email-logs` + `email-admin-stats` | `email/useEmailMonitor` | `useEmailMonitorActions` | **4** |
| `beneficiaries-safe` | `beneficiaries/useBeneficiaries` | `useBeneficiarySettingsPage`, `core/usePrefetchPages`, `messaging/useBulkMessaging`, `notifications/useNotificationBeneficiaries` | **5** |
| `beneficiary-dashboard` | (مفتاح RPC) `dashboard/useBeneficiaryDashboardRpc` | `useBeneficiaryDashboardPage` (5 مواضع invalidate) | **6** |
| `public-stats` | `content/usePublicStats` | `useLandingStatsSettings` | **2** |
| `conversations` | `messaging/useMessaging` | `useBulkMessageSender`, `core/usePrefetchPages` | **3** |

---

## 2. التقسيم المقترح — 11 ملف مركزي

نفس نمط `lib/queryKeys/dashboardKeys.ts` (factory + `prefixes`). كل ملف يخدم مجالاً واحداً.

### 2.1 `lib/queryKeys/invoicesKeys.ts`
**يجمع**: `invoices`, `payment_invoices`, `tenant_payments`, `contract_invoice_summary`, `invoice-chain`
**يستهلكه**:
- `hooks/data/invoices/useInvoices.ts`
- `hooks/data/invoices/usePaymentInvoices.ts` ⚠️ (5 مفاتيح، 3 invalidations — أعلى نقطة درفت)
- `hooks/data/contracts/useTenantPayments.ts`
- `hooks/data/zatca/useZatcaInvoices.ts`, `useZatcaInvoiceActions.ts`
- `hooks/data/core/usePrefetchPages.ts`

### 2.2 `lib/queryKeys/contractsKeys.ts`
**يجمع**: `contracts`, `contracts_safe`, `contract_fiscal_allocations`
**يستهلكه**:
- `hooks/data/contracts/useContracts.ts`
- `hooks/data/financial/contracts/useContractAllocations.ts`
- `hooks/data/invoices/usePaymentInvoices.ts` (cross)

### 2.3 `lib/queryKeys/advancesKeys.ts`
**يجمع**: `advance_requests`, `advance_carryforward`, `max-advance`, `distributions`, `my-distributions`, `beneficiary-distribution-history`
**يستهلكه**:
- `hooks/data/financial/advances/*` (4 ملفات)
- `hooks/data/financial/distribution/useDistribute.ts`, `useDistributionHistory.ts`
- `hooks/data/beneficiaries/useMyDistributions.ts`

### 2.4 `lib/queryKeys/messagingKeys.ts`
**يجمع**: `conversations`, `messages`, `unread-messages-count`
**يستهلكه**: `hooks/data/messaging/*`, `hooks/page/admin/messaging/useBulkMessageSender.ts`, `core/usePrefetchPages.ts`

### 2.5 `lib/queryKeys/supportKeys.ts`
**يجمع**: `support_tickets`, `ticket_replies`, `support_stats`, `support_analytics`
**يستهلكه**: `hooks/data/support/*` (3 ملفات)

### 2.6 `lib/queryKeys/zatcaKeys.ts`
**يجمع**: `zatca-certificates`, `zatca-operation-log`, `zatca-invoices`, `zatca-payment-invoices`, `zatca-required-settings`
**يستهلكه**:
- `hooks/data/zatca/*` (6 ملفات)
- `hooks/page/admin/management/zatca/useZatcaCompliance.ts` ⚠️ (4 invalidations cross-file)

### 2.7 `lib/queryKeys/appSettingsKeys.ts`
**يجمع**: `app-settings`, `app-settings-all`, `app-settings-history`, `registration-enabled`
**يستهلكه**:
- `hooks/data/settings/app/*` (4 ملفات)
- `hooks/data/settings/waqf/useWaqfInfo.ts`
- `hooks/data/settings/permissions/useRegistrationEnabled.ts`
- `hooks/page/admin/settings/useWaqfInfoSave.ts`, `useLogoUpload.ts` ⚠️
- `hooks/page/admin/management/zatca/useZatcaForm.ts`, `useZatcaCompliance.ts` ⚠️
- `hooks/auth/role/useUserManagementMutations.ts`

### 2.8 `lib/queryKeys/fiscalYearKeys.ts`
**يجمع**: `fiscal_years`, `fiscal_years_published_all`, `fiscal-year-summary`, `fiscal-year-summaries`, `multi-year-summary`, `year-comparison-summary`
**يستهلكه**:
- `hooks/data/financial/fiscalYears/*` (4 ملفات)
- `hooks/data/content/usePublishedFiscalYears.ts`
- `hooks/page/admin/financial/useFiscalYearManagement.ts` ⚠️ (4 invalidations)
- `hooks/data/core/usePrefetchPages.ts`

### 2.9 `lib/queryKeys/beneficiariesKeys.ts`
**يجمع**: `beneficiaries`, `beneficiaries-safe`, `beneficiaries-decrypted`, `beneficiary-users`, `my-beneficiary`, `my_beneficiary_finance`, `my_beneficiary_finance_raw`, `beneficiary-dashboard`, `total-beneficiary-percentage`
**يستهلكه**:
- `hooks/data/beneficiaries/*` (5 ملفات)
- `hooks/data/dashboard/useBeneficiaryDashboardRpc.ts`
- `hooks/data/notifications/useNotificationBeneficiaries.ts`
- `hooks/data/messaging/useBulkMessaging.ts`
- `hooks/data/financial/advances/useAdvanceRequests.ts`, `useAdvanceQueries.ts`
- `hooks/data/financial/dashboard/useTotalBeneficiaryPercentage.ts`
- `hooks/auth/role/useUserManagementMutations.ts`
- `hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts` ⚠️ (5 invalidations)
- `hooks/page/beneficiary/settings/useBeneficiarySettingsPage.ts`
- `core/usePrefetchPages.ts`

### 2.10 `lib/queryKeys/financialKeys.ts`
**يجمع**: `accounts`, `income`, `income_comparison_raw`, `expenses`, `expense_budgets`
**يستهلكه**:
- `hooks/data/financial/accounts/useAccounts.ts`
- `hooks/data/financial/income/*` (2)
- `hooks/data/financial/expenses/*` (2)
- `hooks/data/financial/advances/useAdvanceRequests.ts`, `distribution/useDistribute.ts`
- `hooks/data/contracts/useTenantPayments.ts`, `invoices/usePaymentInvoices.ts` (cross)

### 2.11 `lib/queryKeys/contentKeys.ts`
**يجمع**: `annual_report_items`, `annual_report_status`, `waqf_bylaws`, `public-stats`
**يستهلكه**:
- `hooks/data/content/*` (3 ملفات)
- `hooks/page/admin/settings/useLandingStatsSettings.ts`

### 2.12 ملفات صغيرة قائمة بذاتها (مفاتيح يتيمة — اختياري دمجها لاحقاً)
| مفتاح | الملف |
|---|---|
| `audit_log`, `audit_log_today_count`, `access_log*`, `client_errors` | → `lib/queryKeys/auditKeys.ts` |
| `notifications`, `email-logs`, `email-admin-stats` | → `lib/queryKeys/notificationsKeys.ts` |
| `units`, `all-units`, `properties_names` | → `lib/queryKeys/propertiesKeys.ts` |
| `user-role-counts` | → `lib/queryKeys/usersKeys.ts` |

---

## 3. الهيكل القياسي لكل ملف (مثال `invoicesKeys.ts`)

```ts
/**
 * مفاتيح React Query لمجال الفواتير — مصدر الحقيقة الوحيد.
 */
export const invoicesKeys = {
  /** قائمة الفواتير حسب السنة المالية */
  byFiscalYear: (fiscalYearId: string) =>
    ['invoices', fiscalYearId] as const,
  /** فواتير الدفع لعقد بعينه */
  paymentInvoices: (contractId: string) =>
    ['payment_invoices', contractId] as const,
  /** ملخص فواتير العقد */
  contractInvoiceSummary: (contractId: string) =>
    ['contract_invoice_summary', contractId] as const,
  /** مدفوعات المستأجر لعقد */
  tenantPayments: (contractId: string) =>
    ['tenant_payments', contractId] as const,
  /** سلسلة ربط فواتير ZATCA */
  invoiceChain: (fiscalYearId: string) =>
    ['invoice-chain', fiscalYearId] as const,

  /** Prefixes — للاستخدام في realtime/cross-invalidation */
  prefixes: {
    invoices: ['invoices'] as const,
    paymentInvoices: ['payment_invoices'] as const,
    contractInvoiceSummary: ['contract_invoice_summary'] as const,
    tenantPayments: ['tenant_payments'] as const,
    invoiceChain: ['invoice-chain'] as const,
  },
} as const;
```

**القواعد الثابتة (مأخوذة من `dashboardKeys.ts` الحالي)**:
1. أول عنصر في كل مفتاح ثابت ولا يتغير (لأن realtime يستخدم predicate على `queryKey[0]`).
2. `prefixes.*` متاحة للـ `invalidateQueries({ queryKey: ... })` cross-file.
3. كل factory تأخذ مدخلات typed بدلاً من `(...args: any[])`.
4. `as const` على القيمة النهائية وكل tuple.

---

## 4. خطة التنفيذ خطوة-بخطوة (12 خطوة، مرتّبة حسب الأولوية)

> ترتّبت من **أعلى مخاطر cross-file** إلى **أبسط المجالات**. كل خطوة مستقلة، يمكن مراجعتها وقياسها على حدة، وتمر فحص typecheck + lint + الاختبارات.

### الموجة أ — أعلى مخاطر الـ drift (4 ملفات)

| # | إنشاء | تعديل (refactor) | فائدة |
|---|---|---|---|
| 1 | `lib/queryKeys/appSettingsKeys.ts` | 6 ملفات data + 4 ملفات page | إزالة أكبر مصدر drift (`app-settings-all` يُستخدم في 7 مواضع) |
| 2 | `lib/queryKeys/zatcaKeys.ts` | 6 data + 1 page (compliance) | كل `useZatcaCompliance` يلغّي 4 مفاتيح من ملف خارجي |
| 3 | `lib/queryKeys/fiscalYearKeys.ts` | 5 data + 1 page (`useFiscalYearManagement` يلغّي 4 مرات) | إقفال السنة يلغي مفاتيح عدة منتشرة |
| 4 | `lib/queryKeys/invoicesKeys.ts` | 5 data | `usePaymentInvoices.ts` يحمل 5 مفاتيح + 3 invalidations |

### الموجة ب — مجالات كبيرة منتشرة (4 ملفات)

| # | إنشاء | تعديل |
|---|---|---|
| 5 | `lib/queryKeys/beneficiariesKeys.ts` | 11 ملف (مجمل المنتجين + المستهلكين) |
| 6 | `lib/queryKeys/advancesKeys.ts` | 7 ملفات data |
| 7 | `lib/queryKeys/financialKeys.ts` | 7 ملفات data (cross مع invoices/contracts) |
| 8 | `lib/queryKeys/contractsKeys.ts` | 3 ملفات data |

### الموجة ج — مجالات أصغر وأقل تشابكاً (4 ملفات)

| # | إنشاء | تعديل |
|---|---|---|
| 9 | `lib/queryKeys/messagingKeys.ts` | 3 data + 1 page |
| 10 | `lib/queryKeys/supportKeys.ts` | 3 data |
| 11 | `lib/queryKeys/contentKeys.ts` | 3 data + 1 page |
| 12 | الملفات اليتيمة (audit/notifications/properties/users) | حسب الحاجة |

### بعد كل موجة (Definition of Done)

- ✅ `bun run typecheck` نظيف.
- ✅ `bun run lint` نظيف.
- ✅ `bunx vitest run` — اختبارات المجال المعدّل خضراء.
- ✅ بحث grep يثبت **0** ظهور حرفي لأي من المفاتيح المُهاجَرة خارج ملف `queryKeys/*` المخصّص.

### حاجز ESLint (اختياري، يُضاف بعد الموجة ج)

إضافة قاعدة `no-restricted-syntax` تمنع `queryKey: ['<literal>'...]` خارج `lib/queryKeys/` و `lib/services/`، لمنع عودة الأنماط القديمة.

```js
{
  selector: "Property[key.name='queryKey'] > ArrayExpression > Literal:first-child",
  message: "استخدم factory من lib/queryKeys/ بدلاً من literal مباشر."
}
```

---

## 5. ملاحظات تقنية

- **`useCrudFactory`**: المفاتيح المُولَّدة بـ `useCrudFactory` (مثل `useExpenses`, `useAccounts`) تأتي من `tableName` معامل. التوصية: تمرير المفتاح صراحةً من `*Keys.ts` بدلاً من الاعتماد على `tableName` ضمنياً، أو تطوير `useCrudFactory` ليقبل `queryKeys` object.
- **`core/usePrefetchPages.ts`** و **`core/useDashboardRealtime.ts`**: يستخدمان `prefixes` متعددة. هذان الملفان أول من سيستفيد من `prefixes` الجديدة المنظّمة.
- **التوافق العكسي**: الترحيل آمن لأن الـ tuple النهائي يبقى متطابقاً حرفياً مع المفاتيح القديمة. لا حاجة لـ `queryClient.clear()` أو invalidation شامل بعد كل خطوة.
- **التراجع (rollback)**: كل موجة يمكن تراجعها بـ `git revert` واحد لأن الملفات الجديدة معزولة.
