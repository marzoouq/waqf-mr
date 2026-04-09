

# خطة تنفيذ البنود المتبقية من التقرير المعماري

## نظرة عامة

3 خطوات: إعادة تسمية مجلد، استخراج مكون، وتصنيف/تحسين `as unknown as`. لا تغييرات وظيفية.

---

## الخطوة 1 — إعادة تسمية `hooks/page/admin/settings/` → `management/`

إنشاء `src/hooks/page/admin/management/` ونقل 11 ملفاً إليه، ثم تحديث 9 مستوردين:

| الملف المستورد | الهوك المستخدم |
|---------------|---------------|
| `pages/dashboard/BylawsPage.tsx` | `useBylawsPage` |
| `pages/dashboard/PropertiesPage.tsx` | `usePropertiesPage` |
| `pages/beneficiary/PropertiesViewPage.tsx` | `usePropertiesViewData` |
| `pages/dashboard/AuditLogPage.tsx` | `useAuditLogPage` |
| `pages/dashboard/ChartOfAccountsPage.tsx` | `useChartOfAccountsPage` |
| `pages/dashboard/SystemDiagnosticsPage.tsx` | `useSystemDiagnostics` |
| `pages/dashboard/BeneficiariesPage.tsx` | `useBeneficiariesPage` |
| `components/settings/ZatcaSettingsTab.tsx` | `useZatcaSettings` |
| `components/settings/BulkNotificationsTab.tsx` | `useBulkNotifications` |

---

## الخطوة 2 — نقل `PageLoader` إلى `components/common/`

- إنشاء `src/components/common/PageLoader.tsx` بنفس المحتوى (سطر 43-51 من App.tsx)
- استبدال التعريف المحلي في `App.tsx` باستيراد

---

## الخطوة 3 — تحسين `as unknown as` (تصنيف + إصلاح ما يمكن)

بعد الفحص، الحالات تنقسم إلى 3 فئات:

### (أ) مبرر — RPC responses (لا يمكن حله بدون Zod)
إضافة تعليق `// RPC — cast مبرر، يحتاج Zod validation لاحقاً`:
- `useYearComparisonData.ts` — `ComparisonRpcResult`
- `useMultiYearSummary.ts` — `RpcYearEntry[]`
- `useMaxAdvanceAmount.ts` — `ServerAdvanceData`
- `useSupportAnalytics.ts` — `SupportAnalyticsData`
- `useBeneficiaryDashboardData.ts` — `BeneficiaryDashboardData`

### (ب) مبرر — Supabase JSON parameter / null parameter
- `useContractAllocations.ts` — cast لـ `Json` (ضروري لأن Supabase يتوقع `Json`)
- `useBeneficiaries.ts` — `null as unknown as string` (RPC parameter)

### (ج) قابل للتحسين — select types يمكن تدقيقها
هذه الملفات تستخدم `.select()` عادي (ليس RPC) لكن الأنواع المولّدة لا تطابق الـ interface المحلي. الحل: تعريف الـ interface ليطابق ما يُرجعه Supabase بدلاً من cast:
- `useAdvanceQueries.ts` — 3 casts على `.select()` عادي
- `usePaymentInvoices.ts` — 1 cast
- `useArchiveLog.ts` — 1 cast
- `useAccessLogTab.ts` — 1 cast
- `useZatcaCertificates.ts` — 1 cast
- `useDashboardSummary.ts` — 2 casts (heatmap + recent contracts)
- `useAdvanceRequests.ts` — 1 cast
- `useAuditLogStats.ts` — 1 cast

**المنهج لفئة (ج)**: فحص نوع الاستجابة الفعلي عبر LSP hover، وإذا كان النوع المولّد متوافقاً مع الـ interface → حذف `as unknown as` واستخدام type assertion مباشر `as T[]` أو إزالة الـ cast كلياً. إذا لم يتوافق → إبقاء cast مع تعليق.

**ملاحظة**: الـ casts في `hooks/page/` (مثل `useContractForm`, `useInvoicesPage`, `useExpensesPage`) تستخدم `as unknown as Parameters<typeof mutateAsync>[0]` — هذه مبررة لأن الـ CRUD factory ينتج أنواعاً عامة. ستُوثَّق بتعليق فقط.

---

## التحقق

`npx tsc --noEmit` بعد كل خطوة.

## ملخص التأثير

| الخطوة | ملفات جديدة | ملفات معدّلة |
|--------|------------|-------------|
| 1: إعادة تسمية settings/ | 11 (منقولة) | 9 |
| 2: نقل PageLoader | 1 | 1 |
| 3: تحسين as unknown as | 0 | ~15 |

