
# الموجة الرابعة — خطة تنفيذ مُحقَّقة بالأرقام

## الحقائق المؤكدة (تم التحقق منها للتو)

| البند | التأكيد |
|------|---------|
| `vendor-pdf` في modulepreload | ✅ مؤكد في `dist/index.html` |
| `lucide-react@1.7.0` | ✅ `npm ls` يؤكد (نسخة 2017) |
| ملفات تستورد `@/utils/pdf` | **21** (وليس 23) — منها **2 type-only** و **19 value** |

## النطاق الحقيقي للتعديل: **19 ملف فقط**

### Type-only (لا تُلمس — آمنة بالفعل)
- `src/hooks/data/settings/usePdfWaqfInfo.ts`
- `src/utils/pdf/index.ts` re-exports

### Value imports (تُحوَّل إلى dynamic) — 19 ملف
**Pages (8):** ContractsPage, ExpensesPage, IncomePage, InvoicesPage, PropertiesPage, BeneficiariesPage, BylawsPage, beneficiary/PropertiesViewPage
**Hooks (8):** useAccountsViewPage, useBylawsViewPage, useContractsViewPage, useDisclosurePage, useInvoicesViewPage, useMySharePdfHandlers, useAuditLogPage, useReportsData
**Components (3):** DistributeDialog, PaymentInvoiceToolbar, PropertyUnitsDialog, YearOverYearComparison

## الخيار المختار: **(أ)** — تنفيذ A فقط

سبب الاختيار:
- **(ب)** و **(ج)** يحتاجان قرار منفصل لأن ترقية lucide-react من 1.7→0.544 تكسر API بالكامل (تغيّرت أسماء أيقونات كثيرة بين النسختين). تستحق موجة منفصلة بحقها.
- **(أ)** المكسب الأكبر بأقل مخاطرة: −179KB gzip من initial load.

## النمط الموحَّد للتحويل

```ts
// قبل
import { generateContractsPDF } from '@/utils/pdf';
const handleExport = () => generateContractsPDF(data, waqfInfo);

// بعد
const handleExport = async () => {
  const { generateContractsPDF } = await import('@/utils/pdf');
  await generateContractsPDF(data, waqfInfo);
};
```

ملاحظات:
- `import type { PdfWaqfInfo }` يبقى ثابتاً (TypeScript يحذفه عند build)
- في hooks: handlers تصبح `async` — التواقيع الخارجية لا تتغير
- toast/notify يبقى كما هو حول الـ await

## خطوات التنفيذ

1. تحويل 19 ملف على نمط dynamic import (تعديل آلي متَّسق)
2. `npx tsc --noEmit` — تأكيد عدم وجود أخطاء أنواع
3. `npx vite build` — التحقق من أن `vendor-pdf` لم يعد في `<link rel="modulepreload">` ضمن `dist/index.html`
4. توليد `/mnt/documents/stats-v4.html`
5. جدول مقارنة قبل/بعد لـ initial load

## الملفات
```
19 ملف (تحويل static→dynamic import فقط — handlers)
0 ملف بنية (لا vite.config.ts، لا package.json)
```

## الضمانات
- **صفر تغيير سلوكي** — نفس الدوال، نفس النتائج، نفس الـ UX (تأخير ميلي ثانية واحدة عند أول ضغطة على زر تصدير)
- لا مساس بملفات المصادقة
- لا مساس بـ `vite.config.ts` أو `package.json`
- `tsc --noEmit` نظيف
- إن فشل tsc بعد التحويل، سأرجع كل ملف لحالته الأصلية وأبلِّغك

## النتيجة المتوقعة
- vendor-pdf يخرج من `<link rel="modulepreload">` ✅
- **−179KB gzip** من initial load كل صفحة
- يُحمَّل فقط عند أول ضغطة على زر تصدير PDF فعلي

## المؤجَّل لموجة قادمة (موافقة منفصلة)
- **B/C:** lucide-react@1.7.0 → 0.544.x — يتطلب fix breaking changes في أسماء أيقونات (Trash2, Pencil, إلخ قد تختلف). موجة مستقلة.
