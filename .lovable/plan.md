

# فحص جنائي شامل — استيرادات vendor-pdf المتبقية

## نتائج الفحص

بعد فحص شامل لجميع ملفات المشروع، تبيّن أن **5 ملفات إضافية** لا تزال تستخدم `import autoTable from 'jspdf-autotable'` كاستيراد ثابت، مما يسحب `vendor-pdf` (~186KB gzip) إلى التحميل الأولي:

| # | الملف | الاستيراد الثابت |
|---|-------|-----------------|
| 1 | `src/utils/pdf/accounts.ts` | `import autoTable, { type CellHookData } from 'jspdf-autotable'` |
| 2 | `src/utils/pdf/entities.ts` | `import autoTable from 'jspdf-autotable'` |
| 3 | `src/utils/pdf/beneficiary.ts` | `import autoTable from 'jspdf-autotable'` |
| 4 | `src/utils/pdf/auditLog.ts` | `import autoTable from 'jspdf-autotable'` |
| 5 | `src/utils/pdf/expenses.ts` | `import autoTable from 'jspdf-autotable'` |

### لماذا هذا مهم؟

ملف `src/utils/pdf/index.ts` (barrel file) يعيد تصدير دوال من هذه الملفات بشكل ثابت. أي صفحة تستورد دالة واحدة من `@/utils/pdf` تُجبر Vite على تضمين الاستيرادات الثابتة لـ `jspdf-autotable` → `jspdf` → `vendor-pdf` في الحزمة.

### ملاحظة إيجابية

- استيرادات `import type jsPDF from 'jspdf'` في 6 ملفات أخرى — **سليمة** ✅ (تُحذف عند البناء)
- الملفات التي تم إصلاحها سابقًا (reports, invoices, forensicAudit, bylaws, comparison) — **سليمة** ✅

## خطة الإصلاح

### لكل ملف من الخمسة:

1. **حذف** سطر `import autoTable from 'jspdf-autotable'` من أعلى الملف
2. **إضافة** `const { default: autoTable } = await import('jspdf-autotable')` داخل كل دالة تصدير تستخدم `autoTable`
3. لملف `accounts.ts` خصوصًا: نقل `type CellHookData` إلى `import type { CellHookData } from 'jspdf-autotable'` (استيراد نوع فقط — لا يؤثر على الحزمة)

### التفاصيل التقنية

```text
الملف                    الدوال المتأثرة
─────────────────────    ─────────────────────────────────
accounts.ts              generateAccountsPDF, generateDistributionsPDF
entities.ts              generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF
beneficiary.ts