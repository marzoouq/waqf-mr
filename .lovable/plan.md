# خطة التنفيذ — موجة gates + تقسيمات الحجم

تاريخ: 2026-05-27 · مرجع التدقيق: `.lovable/audit-2026-05-27.md`

## ملفات جديدة (5)

1. **`src/hooks/page/admin/financial/useAccountsExtras.ts`** — يجمع `usePaymentInvoices` + `useAdvanceRequests` + `useTotalBeneficiaryPercentage` + `useOverdueSplit` ويحسب `unpaidInvoices` و `pendingAdvances`. (≈40 سطر)

2. **`src/hooks/page/admin/financial/useUnifiedInvoices.ts`** — يدمج فواتير الشراء وفواتير الإيجار في عرض موحّد ويطبّق الفلاتر (`source`, `status`, `search`). (≈75 سطر)

3. **`src/components/settings/fiscal-year/ReopenFiscalYearDialog.tsx`** — حوار إعادة الفتح (مستخرج من `FiscalYearManagementTab`). (≈75 سطر)

4. **`src/components/settings/fiscal-year/CascadeDeleteFiscalYearDialog.tsx`** — حوار الحذف الشامل. (≈100 سطر)

5. **`src/components/expenses/vouchers/VoidVoucherDialog.tsx`** — حوار إلغاء سند صرف. (≈55 سطر)

## ملفات تُعدَّل (6)

### `eslint.config.js` — إضافة 3 gates
- `no-restricted-imports` لـ `src/utils/**` يمنع `sonner` و `@/integrations/supabase/*`.
- `no-restricted-imports` لـ `src/hooks/data/**` يمنع `sonner` (السماح بـ supabase كاستثناء موثق).
- `no-restricted-imports` لـ `src/hooks/domain/**` يمنع `@/integrations/supabase/*`.
- `max-lines` warn:
  - `src/components/**/*.{ts,tsx}` → 200
  - `src/pages/**/*.{ts,tsx}` → 200
  - `src/hooks/page/**/*.ts` → 180
  - استثناء tests (override موجود).

### `src/hooks/page/admin/financial/useAccountsPage.ts` (204→~177)
- استبدال الأسطر 90-107 بسطر واحد: `const extras = useAccountsExtras(data.fiscalYearId, fiscalYearStartDate);`
- حذف 5 استيرادات منقولة + `useMemo`.
- تقليص رأس الكومنت من 9 إلى 3 أسطر.
- تحديث المراجع: `paymentInvoices`, `advanceRequests`, `totalBenPct`, `unpaidInvoices`, `pendingAdvances`, `overdueSplit` → `extras.*`.

### `src/hooks/page/admin/financial/useInvoicesPage.ts` (195→~154)
- استبدال الأسطر 51-96 باستدعاء `useUnifiedInvoices(invoices, rentInvoices, sourceFilter, filterStatus, searchQuery)`.

### `src/components/settings/fiscal-year/FiscalYearManagementTab.tsx` (258→~144)
- حذف `ReopenDialog` (سطور 20-60) و `CascadeDeleteDialog` (سطور 62-143).
- استيراد من الملفين الجديدين.

### `src/components/expenses/vouchers/VoucherList.tsx` (205→~177)
- حذف بلوك الـ AlertDialog (سطور 168-200) واستبداله بـ `<VoidVoucherDialog ... />`.
- نقل `voidReason` state إلى الحوار الجديد.

### `src/utils/README.md` — تنظيف صياغة (P4)
- توضيح أن ذكر `sonner` للممنوعات فقط.

## التحقق بعد التنفيذ
- `tsc --noEmit` نظيف.
- `wc -l` على الـ4 ملفات يُظهر الكل تحت الحدود.
- ESLint بدون أخطاء جديدة على الكود الموجود.

## خارج النطاق
- لا تغييرات DB / RLS / Edge Functions / Auth.
- ملفات الاختبار تبقى كما هي.
