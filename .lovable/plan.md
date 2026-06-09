# خطة التحسين المعمارية — نسخة مُحقَّقة 100%

## نتائج التحقق الإضافي

تم إعادة فحص كل عنصر في المسودة الأصلية وتصحيح ما يلي:

| البند الأصلي | التصحيح بعد التحقق |
|---|---|
| ~95 inline queryKey | **الصحيح: 85 في `hooks/data/` + ~10 في `hooks/page` & `hooks/auth`** |
| O2: `useRetryQueries` يحتاج إعادة كتابة | **مكتمل جزئياً** — يقبل `string[]` فقط، لكن أحد المستدعين (`useBeneficiaryDashboardPage`) يستخدم spread (`[...prefixes.dashboard]`) بنجاح. التغيير المطلوب: توسيع التوقيع فقط لقبول `readonly unknown[]` directly |
| #11: دمج `useContracts` + `useContractsForPdf` | **يُلغى** — أنماط مختلفة جوهرياً: `useContracts` يستخدم `useQuery`، بينما `useContractsForPdf` (29 سطر فقط) دالة `useCallback` lazy تُستدعى عند التصدير. الدمج يكسر فصل الاهتمامات |
| O1: `SystemDiagnosticsPage` لديها 4 useEffect/useState | **الصحيح: 3 `useState` + 1 `useMemo` فقط** (146 سطر) — أقل أولوية مما كان مذكوراً |
| #6: 3 مكونات كبيرة | **`ZatcaFormCards.tsx` (182 سطر) أيضاً مرشّح** — يستحسن ضمّه |

## أعلى الملفات كثافةً بمفاتيح inline (مرتبة)

```text
9  src/hooks/data/invoices/usePaymentInvoices.ts        ← cross-domain (accounts/contracts)
7  src/hooks/data/messaging/useMessaging.ts
6  src/hooks/data/content/useAnnualReport.ts
5  src/hooks/data/support/useSupportTicketMutations.ts
3  src/hooks/data/properties/useUnits.ts
3  src/hooks/data/financial/distribution/useDistribute.ts
3  src/hooks/data/contracts/useTenantPayments.ts
3  src/hooks/data/audit/useAccessLogTab.ts
+ 27 ملفات أخرى بمفتاح أو اثنين
```

## الموجات المُعاد تجميعها (حسب الملفات الفعلية لا الجداول)

### الموجة C — Contracts & Properties (أعلى أولوية)
**ملف:** `src/lib/queryKeys/contractsKeys.ts`
**يغطي:** `contracts`, `contracts_safe`, `contract_fiscal_allocations`, `tenant_payments`, `units`, `all-units`, `properties_names`
**ملفات المتأثرة:** `useContracts.ts`, `useTenantPayments.ts`, `useContractAllocations.ts`, `useUnits.ts`, `usePropertiesMap.ts`, + invalidations في `usePaymentInvoices.ts` و `useDistribute.ts`

### الموجة D — Financial Core
**ملف:** `src/lib/queryKeys/financialKeys.ts` (أو ثلاثة: `accountsKeys`, `incomeExpensesKeys`, `distributionsKeys`)
**يغطي:** `accounts`, `income`, `income_comparison_raw`, `expenses`, `expense_budgets`, `distributions`, `my-distributions`, `my-beneficiary`, `total-beneficiary-percentage`, `multi-year-summary`, `year-comparison-summary`, `aggregated-distributions`
**ملفات:** 12 ملف في `hooks/data/financial/**`

### الموجة E — Messaging & Support & Notifications
**ملف:** `src/lib/queryKeys/messagingKeys.ts` + `supportKeys.ts`
**يغطي:** `conversations`, `messages`, `unread-messages-count`, `support_tickets`, `ticket_replies`, `support_stats`, `support_analytics`, `notifications`
**ملفات:** `useMessaging.ts`, `useUnreadMessages.ts`, `useSupportTickets*.ts`, `useSupportAnalytics.ts`, `useNotifications*.ts`

### الموجة F — Admin / Audit / Content / Email
**ملف:** `adminUsersKeys.ts`, `auditKeys.ts`, `contentKeys.ts`, `emailKeys.ts`
**يغطي:** `admin-users`, `user-role-counts`, `orphaned-beneficiaries`, `unlinked-beneficiaries`, `audit_log`, `audit_log_today_count`, `client_errors`, `annual_report_status`, `annual_report_items`, `bylaws`, `waqf_bylaws`, `public-stats`, `email-logs`, `email-admin-stats`
**ملفات:** ~12 ملف في `hooks/data/{audit,content,email,users,beneficiaries}/` + 7 ملفات في `hooks/page` و `hooks/auth/role`

---

## الخطة النهائية المرتبة

| # | الخطوة | الجهد | الأولوية | المخرج |
|---|---|---|---|---|
| 1 | **الموجة C** — `contractsKeys.ts` (contracts/properties/tenant_payments) | متوسط | 🟡 عالية | 0 inline keys في `data/contracts/`, `data/properties/`, `data/financial/contracts/` |
| 2 | **الموجة D** — `financialKeys.ts` (accounts/income/expenses/distributions) — مع تجزئة لو تجاوز 200 سطر | متوسط+ | 🟡 عالية | 0 inline keys في `data/financial/{accounts,income,expenses,distribution,dashboard}/` |
| 3 | **الموجة E** — `messagingKeys.ts` + `supportKeys.ts` | متوسط | 🟡 عالية | 0 inline في `data/messaging/`, `data/support/`, `data/notifications/` |
| 4 | **الموجة F** — `adminUsersKeys.ts` + `auditKeys.ts` + `contentKeys.ts` + `emailKeys.ts` | صغير-متوسط | 🟡 متوسطة | 0 inline keys في باقي `hooks/data/` + 7 ملفات `hooks/page`/`hooks/auth` |
| 5 | **توسيع `useRetryQueries`** ليقبل `Array<string \| readonly unknown[]>` ثم تحديث 10 مستدعين لاستخدام `prefixes` directly | صغير | 🟡 متوسطة | إزالة آخر literals في `hooks/page/beneficiary/` |
| 6 | **تجزئة `aggregatedAnnualReport.ts`** (274 س.) إلى builders فرعية في `utils/pdf/reports/aggregated/` (sections/headers/totals) | متوسط | 🟡 متوسطة | كل ملف ≤200 سطر |
| 7 | **تجزئة `diagnosticsReadService.ts`** (222 س.) و `checks.ts` (223 س.) حسب الفئة (financial/security/zatca) | متوسط | 🟡 متوسطة | كل ملف ≤200 سطر |
| 8 | **استخراج page-hooks** لـ `AdvanceRequestDialog` (5 hooks)، `DistributeDialog` (2)، `CreateInvoiceFromTemplate`، `ZatcaFormCards` | صغير-متوسط | 🟡 متوسطة | مكوّنات ≤140 سطر، page-hooks جديدة في `hooks/page/{beneficiary,admin}/dialogs/` |
| 9 | **تجزئة الصفحات على الحافة** (`AnnualReportPage` 196، `DistributionsPage` 190، `MySharePage` 189، `ReportsPage` 187، `AccountsPage` 183) عبر subcomponents فقط (المنطق موجود في page-hooks بالفعل) | متوسط | 🟢 منخفضة | كل صفحة ≤140 سطر |
| 10 | **README مختصر** في `hooks/application/` و `hooks/domain/` يوضح: domain = pure calculations، application = cross-role feature controllers | صغير | 🟢 منخفضة | توثيق |
| 11 | **استخراج `useSystemDiagnosticsPage`** (filter/cleanDialog/deepCleaning state) | صغير | 🟢 منخفضة | صفحة logic-less |
| 12 | **ESLint rule** يمنع `queryKey: ['...']` خارج `src/lib/queryKeys/**` لقفل المكسب (بعد انتهاء الموجات C-F) | صغير | 🟢 منخفضة | حماية ضد الانحراف المستقبلي |

### عناصر مُلغاة (بعد التحقق)
- ~~دمج `useContracts` + `useContractsForPdf`~~ — أنماط مختلفة جوهرياً (Query vs lazy callback)

---

## الخلاصة

- **الخطوات 1-4 (الموجات C/D/E/F)** تنقل المشروع من 85+ inline key إلى 0 — أعلى عائد ✓
- **الخطوة 5** تكمل الانتقال بإزالة آخر literals في page hooks
- **الخطوة 12** تقفل المكسب دائماً عبر lint gate
- الخطوات 6-11 تحسينات بنيوية تنفذ على دفعات صغيرة بدون مخاطر

**التوصية:** البدء بالخطوة 1 (Contracts) لأنها تكسر أكبر تجميع cross-domain (`usePaymentInvoices.ts` يستفيد منها أيضاً).
