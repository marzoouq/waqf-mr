

# تقسيم pdfGenerator.ts إلى وحدات منفصلة

## المبدأ الأساسي
نقل الدوال إلى ملفات متخصصة مع الحفاظ على ملف `index.ts` يعيد تصدير كل شيء لضمان التوافق الكامل مع جميع الاستيرادات الحالية (14 ملف يستورد من هذا الملف).

## هيكل الملفات الجديدة

```text
src/utils/pdf/
  core.ts        - الأنواع + الدوال المشتركة (الخط، الرأس، التذييل، الإطار، أنماط الجداول)
  reports.ts     - generateAnnualReportPDF, generateBeneficiaryStatementPDF, generateAnnualDisclosurePDF
  entities.ts    - generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF
  expenses.ts    - generateExpensesPDF, generateIncomePDF
  accounts.ts    - generateAccountsPDF
  beneficiary.ts - generateMySharePDF, generateDisclosurePDF
  invoices.ts    - generateInvoicesViewPDF
  index.ts       - re-export لكل الدوال والأنواع
```

## التوزيع التفصيلي

### `core.ts` (~215 سطر) - السطور 1-215
- `PdfWaqfInfo` (interface)
- `UnitPdfRow` (interface)
- `loadArabicFont()` 
- `loadLogoBase64()`
- `addHeader()`
- `addHeaderToAllPages()`
- `addPageBorder()`
- `addFooter()`
- ثوابت الألوان: `TABLE_HEAD_GREEN`, `TABLE_HEAD_GOLD`, `TABLE_HEAD_RED`
- دوال الأنماط: `baseTableStyles()`, `headStyles()`, `footStyles()`

### `reports.ts` (~160 سطر) - التقارير الإدارية
- `generateAnnualReportPDF` (السطور 235-292)
- `generateBeneficiaryStatementPDF` (السطور 294-324)
- `generateAnnualDisclosurePDF` (السطور 814-956)

### `entities.ts` (~130 سطر) - تقارير الكيانات
- `generatePropertiesPDF` (السطور 328-358)
- `generateContractsPDF` (السطور 360-400)
- `generateBeneficiariesPDF` (السطور 468-502)
- `generateUnitsPDF` (السطور 971-1031)

### `expenses.ts` (~70 سطر) - تقارير الدخل والمصروفات
- `generateIncomePDF` (السطور 402-433)
- `generateExpensesPDF` (السطور 435-466)

### `accounts.ts` (~160 سطر) - الحسابات الختامية
- `generateAccountsPDF` (السطور 504-661)

### `beneficiary.ts` (~140 سطر) - تقارير المستفيد
- `generateMySharePDF` (السطور 663-731)
- `generateDisclosurePDF` (السطور 733-810)

### `invoices.ts` (~55 سطر) - تقارير الفواتير
- `generateInvoicesViewPDF` (السطور 1033-1084)

### `index.ts` - إعادة التصدير
```text
export { PdfWaqfInfo, UnitPdfRow } from './core';
export { generateAnnualReportPDF, generateBeneficiaryStatementPDF, generateAnnualDisclosurePDF } from './reports';
export { generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF } from './entities';
export { generateIncomePDF, generateExpensesPDF } from './expenses';
export { generateAccountsPDF } from './accounts';
export { generateMySharePDF, generateDisclosurePDF } from './beneficiary';
export { generateInvoicesViewPDF } from './invoices';
```

## التوافق مع الاستيرادات الحالية

الملف الأصلي `src/utils/pdfGenerator.ts` سيُحذف ويُستبدل بـ `src/utils/pdf/index.ts`. جميع الاستيرادات الحالية (14 ملف) تُحدّث لتشير إلى `@/utils/pdf` بدلاً من `@/utils/pdfGenerator`:

| الملف | الاستيراد الحالي | الاستيراد الجديد |
|-------|-----------------|-----------------|
| ExpensesPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| IncomePage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| PropertiesPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| ContractsPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| BeneficiariesPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| AccountsPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| ReportsPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| InvoicesPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| DisclosurePage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| MySharePage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| FinancialReportsPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| AccountsViewPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| InvoicesViewPage.tsx | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |
| usePdfWaqfInfo.ts | `from '@/utils/pdfGenerator'` | `from '@/utils/pdf'` |

## ضمانات السلامة
- لا تغيير في أي دالة PDF - نقل حرفي فقط
- لا تغيير في أي واجهة (interface) أو نوع
- كل ملف فرعي يستورد الدوال المشتركة من `core.ts`
- ملف `index.ts` يضمن أن كل الاستيرادات الخارجية تعمل بنفس الطريقة
- حذف الملف القديم `pdfGenerator.ts` بعد التأكد من عمل كل شيء

