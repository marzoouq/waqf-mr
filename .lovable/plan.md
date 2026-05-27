# خطة التنفيذ النهائية — gates + تقسيمات الحجم

تحقق ميداني مُكتمل: الأحجام (204/195/258/205) مطابقة، الملفات الخمسة الجديدة غير موجودة، `toast` مستخدم فعلاً في `VoucherList.download()` و void، ونمط mutation لـ `overdueSplit` موجود في `useAccountsPage.ts:106-107`. لا يوجد `--max-warnings=0` في CI.

## النطاق
frontend-only + `eslint.config.js`. **لا تغييرات** على DB / RLS / Edge Functions / Auth / ملفات محمية.

## ترتيب التنفيذ
1. استخراج hooks + dialogs (إنشاء الـ5 ملفات الجديدة).
2. تحديث الاستدعاءات في الـ4 ملفات الكبيرة.
3. تعديل `eslint.config.js` (دمج + gates جديدة).
4. تحديث `src/utils/README.md`.
5. تحقق: `tsc --noEmit` + ESLint + `wc -l`.

## الملفات الجديدة (5)

1. **`src/hooks/page/admin/financial/useAccountsExtras.ts`** (~40 سطر)
   - يجمع `usePaymentInvoices` + `useAdvanceRequests` + `useTotalBeneficiaryPercentage` + `useOverdueSplit`.
   - يُرجع: `{ paymentInvoices, advanceRequests, totalBenPct, unpaidInvoices, pendingAdvances, overdueSplit }` كقيم محسوبة فقط (بدون mutation داخلي).

2. **`src/hooks/page/admin/financial/useUnifiedInvoices.ts`** (~75 سطر)
   - يدمج فواتير الشراء + الإيجار ويطبّق `source/status/search`.

3. **`src/components/settings/fiscal-year/ReopenFiscalYearDialog.tsx`** (~75 سطر)
4. **`src/components/settings/fiscal-year/CascadeDeleteFiscalYearDialog.tsx`** (~100 سطر)
5. **`src/components/expenses/vouchers/VoidVoucherDialog.tsx`** (~55 سطر) — ينقل state `voidReason` داخلياً.

## الملفات المُعدَّلة (6)

### `src/hooks/page/admin/financial/useAccountsPage.ts` (204 → ~177)
- استبدال الأسطر 91-107 باستدعاء `useAccountsExtras(...)`.
- **خيار (أ) مُعتمد:** الإبقاء على `let overdueSplit = { prev:0, cur:0 }` المُمرَّر إلى `useAccountsActions` قبل الجلب، ثم mutation بعد الاستدعاء:
  ```ts
  const extras = useAccountsExtras(data.fiscalYearId, fiscalYearStartDate);
  overdueSplit.prev = extras.overdueSplit.prev;
  overdueSplit.cur = extras.overdueSplit.cur;
  ```
- تحديث المراجع إلى `extras.paymentInvoices/advanceRequests/totalBenPct/unpaidInvoices/pendingAdvances`.
- **TODO موثَّق داخل الملف:** إعادة تصميم `useAccountsActions` لاحقاً ليستقبل `overdueSplit` كقيمة مستقرة بدل mutation.
- بدون تغيير ترتيب hooks أو توقيع `useAccountsActions`.

### `src/hooks/page/admin/financial/useInvoicesPage.ts` (195 → ~154)
- استبدال الأسطر 51-96 باستدعاء `useUnifiedInvoices(invoices, rentInvoices, sourceFilter, filterStatus, searchQuery)`.

### `src/components/settings/fiscal-year/FiscalYearManagementTab.tsx` (258 → ~144)
- حذف `ReopenDialog` (20-60) و `CascadeDeleteDialog` (62-143) واستيرادهما من الملفين الجديدين.

### `src/components/expenses/vouchers/VoucherList.tsx` (205 → ~177)
- استبدال بلوك `AlertDialog` (168-200) بـ `<VoidVoucherDialog ... />` ونقل `voidReason` state إلى الحوار.
- **الإبقاء صراحةً على** `import { toast } from 'sonner'` (السطر 32) لأنه مُستخدم في `download()` (سطور 60-62). لا تنظيف زائد للاستيرادات.

### `eslint.config.js` — gates + دمج البلوكَين المكررين
- **دمج بلوكَي `no-restricted-syntax` المكررين** (74-89 و 90-119) في بلوك واحد لـ `src/pages/**` و `src/components/**` يحوي قواعد Supabase وقيود ألوان hex، مع `ignores` للاستثناءات (`InvoicePreviewDialog`, `SignaturePad`). يُزيل البلوك الميت ويثبّت القواعد فعلياً.
- إضافة 3 gates جديدة عبر `no-restricted-imports`:
  - `src/utils/**` → منع `sonner` و `@/integrations/supabase/*`.
  - `src/hooks/data/**` → منع `sonner` (warn).
  - `src/hooks/domain/**` → منع `@/integrations/supabase/*`.
- إضافة `max-lines` (warn):
  - `src/components/**/*.{ts,tsx}` و `src/pages/**/*.{ts,tsx}` → 200
  - `src/hooks/page/**/*.ts` → 180
  - tests/specs مستثناة.
- ملاحظة: CI لا يستخدم `--max-warnings=0` (تحقق مُكتمل)، فلا خطر فشل من تحذيرات جديدة.

### `src/utils/README.md`
- توضيح أن ذكر `sonner` للممنوعات فقط (تنظيف صياغة).

## التحقق بعد التنفيذ
- `wc -l` على الـ4 ملفات → كلها تحت الحد.
- `tsc --noEmit` نظيف.
- ESLint: gates الجديدة `warn` فقط، لا أخطاء جديدة.
- مراجعة بصرية: `useAccountsActions` يستقبل نفس مرجع `overdueSplit`، و`toast` لا يزال مستورداً في `VoucherList.tsx`.

## خارج النطاق
- لا تغييرات DB / RLS / Edge Functions / Auth.
- ملفات الاختبار تبقى كما هي.
- إعادة تصميم `useAccountsActions` (مؤجَّل عبر TODO).
- الملفات المحمية (`config.toml`, `client.ts`, `types.ts`, `.env`).
