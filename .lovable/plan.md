# إصلاح مخالفات `lint:conventions` المعمارية

التشغيل الحالي لـ `bun run lint:conventions` يكشف **21 مخالفة** (وليس 16) في 6 ملفات. كلها تنتهك حدود معمارية موثّقة في `ARCHITECTURE.md` و `mem://conventions/libraries-and-architecture`:

- `hooks/page` يستدعي `supabase.rpc` / `supabase.functions.invoke` مباشرة بدل wrappers الموحّدة.
- `hooks/data` يصدّر hook من `hooks/page` (تبعية عكسية).
- `hooks/data` يستدعي `supabase.rpc` مباشرة بدل `rpc()`.
- `lib/services/` يستدعي `supabase.rpc` مباشرة.
- `lib/diagnostics/checks/` يستخدم `supabase.from/rpc` خارج حدود `lib/services|auth|api|realtime`.

## التغييرات

### 1) `src/hooks/page/admin/financial/useVoucherActions.ts` (5 مخالفات)
استبدال 3 `supabase.rpc` + 2 `supabase.functions.invoke` بـ `rpc()` و `invoke()` من `@/lib/api`. حذف import الـ supabase client. السلوك (toast/onSuccess/onError) يبقى كما هو.

### 2) `src/hooks/data/properties/usePropertyVatSync.ts` (1)
استبدال `supabase.rpc('sync_property_contract_invoice_vat')` بـ `rpc(...)`.

### 3) `src/lib/services/supportService.ts` (1)
استبدال `supabase.rpc('rate_support_ticket')` بـ `rpc(...)`.

### 4) `src/hooks/data/messaging/useBulkMessaging.ts` (1 — تبعية عكسية)
حذف السطر `export { useBulkMessageSender } from '@/hooks/page/admin/messaging/useBulkMessageSender';`.
ثم البحث عن كل المستهلكين عبر `rg "from '@/hooks/data/messaging/useBulkMessaging'"` وتحويل أي استيراد لـ `useBulkMessageSender` ليأتي مباشرة من `hooks/page/admin/messaging/useBulkMessageSender`.

### 5) `src/lib/diagnostics/checks/cardConsistency.ts` + `numericalAudit.ts` (12 مخالفة)
إنشاء **`src/lib/services/diagnosticsReadService.ts`** يلفّ كل قراءات DB التي تحتاجها فحوصات التشخيص (read-only). توقيع المنهج:

```text
listAccountsBasic(limit)
listClosedFiscalYears(limit)
getAccountByFy(fyId)
listDistributionsByFy(fyId)
listBeneficiariesWithShare()
getActiveFiscalYear()
listApprovedAdvancesByFy(fyId)
listOpenPaymentInvoices(limit)
listCarryforwardRecords(limit)
getLatestFiscalYear() // active أو آخر مقفلة
getDashboardFullSummary(fyId) // عبر rpc()
listIncomeByFy(fyId)
listExpensesByFy(fyId)
getLatestClosedFy()
getAccountSnapshotForFy(fyId)
```

كل دالة تستخدم `supabase` (مسموح داخل `lib/services/`) أو `rpc()` لاستدعاءات RPC. ثم في الفحصين نستبدل كل `supabase.from(...)` و `supabase.rpc(...)` بنداء الخدمة. يحذف `import { supabase }` من ملفّي الفحوصات.

## التحقّق بعد التغيير

```bash
bun run lint:conventions        # يجب أن ينخفض إلى 0 مخالفة
bunx vitest run                  # 1985/1985 يجب أن تبقى خضراء
node scripts/audit-ui-permissions.mjs   # 0 GAPs
```

## ما لن يتغيّر

- لا تعديل على RLS أو migrations أو edge functions.
- لا تغيير في سلوك UI أو رسائل toast أو منطق الأعمال — فقط نقل استدعاءات إلى الطبقات الصحيحة.
- التحذيرات الأربعة (ملفات > 200 سطر + `fiscalYearService.test.ts`) خارج النطاق.
