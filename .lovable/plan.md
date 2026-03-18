

# خطة إصلاح الأخطاء المتبقية في نظام الفواتير

## نتائج التحقق المباشر

بعد فحص الكود الفعلي الحالي، هذه هي الأخطاء **المؤكدة فعلاً** والتي تحتاج إصلاح:

| # | البند | الحالة | الملف |
|---|-------|--------|-------|
| BUG-1 | `overdue` مفقودة من `INVOICE_STATUS_LABELS` | ❌ مؤكد | `useInvoices.ts` سطر 43-47 |
| BUG-2 | `fiscalYearLabel` لا يُمرَّر لـ PDF | ❌ مؤكد | `InvoicesViewPage.tsx` سطر 55-67 |
| BUG-4 | `.toLocaleString()` بدون locale | ✅ **تم إصلاحه سابقاً** — السطر 158 يستخدم `fmt()` بالفعل |
| BUG-5 | PDF يُصدِّر المفلتَر بصمت | ❌ مؤكد | `InvoicesViewPage.tsx` |
| BUG-6 | `generateOverdueInvoicesPDF` صامتة | ❌ مؤكد | `invoices.ts` سطر 76 |
| NEW-1 | `statusBadgeVariant` تجهل `overdue` | ❌ مؤكد | `InvoicesViewPage.tsx` سطر 49-53 |
| NEW-2 | `React.FC` بدون import React | ❌ مؤكد | `InvoiceGridView.tsx` سطر 28 |

**BUG-4 لم يعد موجوداً** — السطر 158 يستخدم `fmt(safeNumber(item.amount))` بشكل صحيح.

## التغييرات المطلوبة (6 إصلاحات في 4 ملفات)

### 1. `src/hooks/useInvoices.ts`
- إضافة `overdue: 'متأخرة'` إلى `INVOICE_STATUS_LABELS` (سطر 47)

### 2. `src/pages/beneficiary/InvoicesViewPage.tsx`
- استخراج `fiscalYear` من `useFiscalYear()` (سطر 29)
- بناء `fiscalYearLabel` من `fiscalYear?.label`
- تمريره كبارامتر ثالث لـ `generateInvoicesViewPDF` (سطر 57-67)
- إضافة `overdue` لـ `statusBadgeVariant` ليُرجع `'destructive'` مع outline (سطر 49-53)
- إضافة `toast.info` تحذيري عند التصدير مع وجود `searchQuery` نشط (سطر 55)

### 3. `src/utils/pdf/invoices.ts`
- إضافة `toast.info('لا توجد فواتير متأخرة')` عند `overdue.length === 0` بدل return صامت (سطر 76)

### 4. `src/components/invoices/InvoiceGridView.tsx`
- إضافة `import React from 'react'` أو تغيير `React.FC` إلى typed function (سطر 28)

## ملاحظة
إجمالي التغييرات صغير ومحدد — لا يؤثر على أي منطق آخر.

