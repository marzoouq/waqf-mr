

# خطة الجولة الثانية — تنظيف معماري دقيق ومُتحفّظ

بعد فحص جنائي لكل بند من الـ60، إليك ما يستحق التنفيذ فعلاً وما ثبت عدم دقّته.

---

## ✅ ما سيُنفَّذ (10 بنود مؤكدة بالأدلة)

### 🔴 P0 — انتهاكات اتجاه التبعية الحقيقية

**1. كسر استيراد `types/invoices.ts` من `components/`** (البند #1)
- إزالة السطر 63: `export type { InvoiceTemplateData as InvoicePreviewData } from '@/components/invoices/invoiceTemplateUtils';`
- نقل `interface InvoiceTemplateData` من `src/components/invoices/invoiceTemplateUtils.ts` إلى `src/types/invoices.ts`
- جعل `invoiceTemplateUtils.ts` يستورد `InvoiceTemplateData` من `@/types/invoices` (هو يستورد بالفعل `AllowanceChargeItem` من هناك)
- النتيجة: طبقة `types/` لا تستورد من `components/` نهائياً

**2. تصحيح استيراد `AuditLogTable.tsx`** (البند #2)
- استبدال السطر 12: `from '@/hooks/page/admin/management/useAuditLogPage'` → `from '@/utils/format/auditLabels'`
- المصدر الحقيقي مؤكد في `auditLabels.ts:50-51`
- إزالة `export { getTableNameAr, getOperationNameAr };` من `useAuditLogPage.ts:94` (re-export زائد لا حاجة له بعد التصحيح)

**3. توحيد استيراد `FiscalYear` و `PaymentInvoice` من `@/types`** (البندان #3 و #4)
- التحقق المهم: كلا النوعين **موجودان أصلاً** في `src/types/` (`FiscalYear` في `@/types`, `PaymentInvoice` في `@/types/invoices.ts`)، والـ hooks تعيد تصديرهما فقط
- تحديث 8 ملفات مكوّنات تستورد من hook files مباشرةً:
  - `CollectionReport.tsx`, `YoYYearSelectors.tsx`, `YearOverYearComparison.tsx`, `FiscalYearManagementTab.tsx` (لـ `FiscalYear`)
  - `PaymentInvoiceMobileCards.tsx`, `PaymentInvoiceDesktopTable.tsx`, `PaymentInvoiceToolbar.tsx`, `ContractAccordionGroup.tsx`, `AccordionParts.tsx` (لـ `PaymentInvoice`)
- **استثناء:** ملفات `hooks/page/`, `hooks/data/`, `contexts/` تبقى تستورد من hook (طبقة data، مسموح)
- `FiscalYearSelector.test.tsx` يبقى كما هو (يستخدم mock بمسار hook الفعلي)

### 🟠 P1 — تنظيف Dead Code وتكرار حقيقي

**4. حذف `filtered`/`paginated` الميتة في تبويبات Audit** (البندان #25 و #26)
- `AccessLogTab.tsx` السطور 30-31: حذف `const filtered = logs;` و `const paginated = filtered;` واستبدال الاستخدامات بـ `logs`
- `ArchiveLogTab.tsx` السطر 27: حذف `const filtered = logs;` واستبدال الاستخدامات بـ `logs`
- لا تغيير سلوكي — مجرد إزالة aliases ميتة

**5. توحيد `getStatusBadge` المكرر** (البند #9)
- إنشاء `src/components/contracts/payment-invoices/paymentStatusBadge.tsx` يصدّر `PaymentStatusBadge` كمكوّن
- استخدامه في `PaymentInvoiceMobileCards.tsx` (أسطر 23-31) و `PaymentInvoiceDesktopTable.tsx` (أسطر 33-41)
- نسخة مكررة 100% مؤكدة بمقارنة سطرية

**6. توحيد `MONTH_LABELS` المكرر في `CollectionHeatmap`** (البند #8)
- حذف الأسطر 28-31 في `CollectionHeatmap.tsx`
- استيراد `MONTH_NAMES` من `@/constants/calendar` مباشرةً واستخدامه

**7. حذف re-export الزائد في `accrualUtils.ts`** (البند #48)
- إزالة السطر 7: `export { MONTH_NAMES };`
- المستوردون يستوردون من `@/constants/calendar` مباشرةً (المستهلك الوحيد لهذا الـ re-export هو نفس الملف)

### 🟡 P2 — تحسينات صغيرة موثَّقة

**8. إصلاح Tailwind dynamic classes في `PaymentInvoiceSummaryCards.tsx`** (البند #29)
- الأسطر 38-43 تستخدم `bg-${color}/10` و `text-${color}` — قد تُحذف من البناء بسبب purge
- استبدال `color: string` بـ lookup object يحوي كلاسات كاملة:
  ```ts
  const COLOR_CLASSES = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', value: '' },
    success: { bg: 'bg-success/10', text: 'text-success', value: 'text-success' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive', value: 'text-destructive' },
    warning: { bg: 'bg-warning/10', text: 'text-warning', value: '' },
  };
  ```

**9. استبدال `z-45` غير القياسي في `DashboardLayout.tsx:57`** (البند #51)
- مؤكد: `tailwind.config.ts` لا يعرّف `z-45` (الأرقام 0.45 الموجودة في opacity scale، ليست z-index)
- استبدال بـ `z-40` (قياسي، أعلى من overlay وأقل من sidebar `z-50`)

**10. fallback مرئي بسيط في `YearOverYearComparison.tsx`** (البند #19)
- الأسطر 50 و 60: `<Suspense fallback={null}>` لمكونات كبيرة
- استبدال `fallback={null}` بـ `<Skeleton className="h-32 w-full" />` لمنع وميض الفراغ

---

## ❌ ما لن يُنفَّذ ولماذا (مع الأسباب الجنائية)

| # | الادعاء | سبب الرفض |
|---|---------|-----------|
| #5 | نقل `accrualUtils.ts` خارج `components/` | يُستهلك حصراً من ملفين متجاورين في نفس المجلد (`MonthlyAccrualTable.tsx`, `AccrualHelpers.tsx`)؛ co-location مقصود لتفعيل Fast Refresh (موثَّق في تعليق رأس الملف) |
| #6 | `adminRoutes` كـ JSX const | نمط React Router v6 صحيح؛ `lazyWithRetry` لا تُحمّل الكود فعلياً حتى يُطلب — مجرد تسجيل lazy refs |
| #7 | `forms/index.ts` ناقص | **خاطئ تماماً** — الملف موجود ويُصدّر beneficiary/contract/property |
| #10 | نقل `useNowClock` لـ `hooks/ui/` | المكان الحالي `lib/hooks/` موثَّق ومنطقي (utility hook بدون تبعيات domain) |
| #11, #12 | IIFE و `_getKey` في `VirtualTable` | IIFE pattern صالح؛ `_getKey` بـ underscore prefix هو signal ESLint مقصود |
| #13 | 8 callbacks في `AccountsSettingsBar` | refactor بأثر كبير ومخاطرة عالية على لوحة الحسابات الإنتاجية؛ النمط الحالي type-safe |
| #14 | alias `ITEMS_PER_PAGE = PAGE_SIZE_LIST` | تجميلي بحت؛ يحسّن قابلية القراءة محلياً |
| #15 | خلط lazy/static imports في `DashboardLayout` | أسلوبي؛ TypeScript يقبله بدون مشاكل |
| #16, #17 | استخراج `VITALS` و `VitalDef` | محلي للملف، ولا يُستهلك من خارجه |
| #18 | `ChartSkeleton` المحلي في `YearComparisonCard` | 4 أسطر بسيطة؛ استخدام `ChartSkeletonCard` يضيف dependency بفائدة هامشية |
| #20 | `financial.ts` + `financial/` | نمط TypeScript قياسي ومفيد (ملف للأنواع المسطحة، مجلد للفرعية مثل `dashboard.ts`, `multiYear.ts`) |
| #21, #22 | دمج `withRouteErrorBoundary` + alias `eb` | فصل مقصود؛ `eb` مختصر لأنه يتكرر في كل route |
| #23 | دمج `waqifRoutes` مع `beneficiaryRoutes` | فصل دور صحيح؛ الواقف ≠ المستفيد بصلاحيات مختلفة |
| #24 | تقسيم `common/` لـ 4 مجلدات | تنظيمي؛ 31 ملف ليس مفرطاً، والتقسيم يكسر مئات الاستيرادات |
| #27 | `FiscalYearSelector` يجلب بياناته | **مقصود** — موثَّق باختبار `FiscalYearSelector.test.tsx` يثبت أنه "smart component" بـ mock للـ hook |
| #28 | barrel layout يصدّر constants | تسهيل عملي؛ لا ضرر تقني |
| #30 | `return null` في `FiscalYearWidget` | السلوك الصحيح — لا يجب عرض widget بدون بيانات |
| #31, #32 | `Invoice.status/invoice_type` كـ string | تغيير breaking على نوع مستهلك من 50+ ملف؛ يحتاج مرحلة منفصلة |
| #33 | `RefObject<HTMLDivElement \| null>` | نمط React 19 قياسي |
| #34–44 | دمج ملفات utility/types صغيرة | فصل المسؤولية > حجم الملف؛ الدمج يقلل cohesion ويعقّد tree-shaking |
| #45 | تقسيم `utils/financial/` لمجلدات | reorganization بـ كسر تبعات واسع، فائدة هامشية |
| #46, #47 | خلط imports/MONTH_LABELS موقع | أسلوبي |
| #49 | `ChartSkeleton` vs `ChartSkeletonCard` | اسمان مختلفان لمكونين مختلفين عمداً |
| #50 | `CrudPagination` vs `TablePagination` | استخدامات مختلفة موثَّقة |
| #52 | `null` لـ `lazy()` في DEV | نمط شائع وآمن، TypeScript يقبله |
| #53 | named vs default exports | تفضيل أسلوبي |
| #54, #55 | دمج components صغيرة في `common/` | فصل مقصود |
| #56 | `fiscalYear?.label` undefined | `MobileHeader` يتعامل معه بـ optional chaining |
| #57, #58, #59 | توزيع zatca/diagnostics/fonts | تنظيم متعمد |
| #60 | لا يوجد `routes/index.ts` barrel | App.tsx يستورد 4 ملفات فقط — barrel لا يضيف قيمة |

---

## 📋 الملفات المتأثرة (10 بنود)

### معدّلة (12 ملف)
- `src/types/invoices.ts` — حذف import من components، إضافة `InvoiceTemplateData`
- `src/components/invoices/invoiceTemplateUtils.ts` — استيراد `InvoiceTemplateData` من types
- `src/components/audit/AuditLogTable.tsx` — تصحيح مسار import
- `src/hooks/page/admin/management/useAuditLogPage.ts` — حذف re-export الزائد
- `src/components/audit/AccessLogTab.tsx` — حذف dead code
- `src/components/audit/ArchiveLogTab.tsx` — حذف dead code
- `src/components/contracts/payment-invoices/PaymentInvoiceMobileCards.tsx` — استخدام PaymentStatusBadge، تصحيح import
- `src/components/contracts/payment-invoices/PaymentInvoiceDesktopTable.tsx` — نفس الشيء
- `src/components/contracts/payment-invoices/PaymentInvoiceToolbar.tsx` — تصحيح import
- `src/components/contracts/payment-invoices/PaymentInvoiceSummaryCards.tsx` — color lookup
- `src/components/contracts/CollectionReport.tsx` — تصحيح imports (FiscalYear + PaymentInvoice)
- `src/components/contracts/ContractAccordionGroup.tsx` + `accordion/AccordionParts.tsx` — تصحيح import PaymentInvoice
- `src/components/reports/YoYYearSelectors.tsx` + `YearOverYearComparison.tsx` — تصحيح FiscalYear + Skeleton fallback
- `src/components/settings/fiscal-year/FiscalYearManagementTab.tsx` — تصحيح FiscalYear
- `src/components/dashboard/charts/CollectionHeatmap.tsx` — استخدام MONTH_NAMES
- `src/components/contracts/accrual/accrualUtils.ts` — حذف re-export
- `src/components/layout/DashboardLayout.tsx` — z-45 → z-40

### جديدة (1 ملف)
- `src/components/contracts/payment-invoices/paymentStatusBadge.tsx`

---

## 🛡️ الضمانات

- **لا تغيير منطقي:** كل التغييرات إعادة تنظيم imports أو حذف dead code
- **لا تأثير مالي/أمني:** صفر تعديل على hooks/data أو حسابات
- **لا تعديل ملفات محمية:** `client.ts`, `types.ts`, `config.toml`, `.env`
- **توافق عكسي:** re-exports المتبقية في hooks تحافظ على الاستيرادات القديمة
- **اختبارات:** `FiscalYearSelector.test.tsx` يبقى يعمل (يستخدم hook path الفعلي)

## 🧪 التحقق
```bash
npx tsc --noEmit
npx vitest run
```

## ⏱️ التقدير
- P0 (3 بنود): ~20 دقيقة
- P1 (4 بنود): ~15 دقيقة  
- P2 (3 بنود): ~10 دقائق
- **الإجمالي: ~45 دقيقة**

