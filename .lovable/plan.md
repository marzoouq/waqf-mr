

# خطة تقسيم CollectionReport.tsx و CreateInvoiceFromTemplate.tsx

## 1. CollectionReport.tsx (475 سطر → ~280 سطر)

**استخراج هوك `useCollectionData.ts`** (~120 سطر) إلى `src/hooks/page/useCollectionData.ts`:
- الدالة `getExpectedPaymentsFallback`
- النوع `CollectionRow` و `FilterStatus`
- المنطق الكامل: `invoicePaidMap`, `contractsWithUnpaidInvoices`, `relevantContracts`, `rows`, `filteredRows`, `summary`
- الهوك يستقبل نفس props المكون ويُرجع: `rows`, `filteredRows`, `summary`, `filter/setFilter`, `search/setSearch`, `currentPage/setCurrentPage`, `useDynamicAllocation`

**استخراج `CollectionSummaryCards.tsx`** (~70 سطر) إلى `src/components/contracts/CollectionSummaryCards.tsx`:
- بطاقات الملخص الأربع + شريط التحصيل العام (Progress bar)

**يبقى في الملف الأصلي**: الجدول (mobile + desktop) + أدوات الفلترة + `handleSendAlerts` + `getStatusBadge`

## 2. CreateInvoiceFromTemplate.tsx (450 سطر → ~280 سطر)

**استخراج هوك `useCreateInvoiceForm.ts`** (~100 سطر) إلى `src/hooks/page/useCreateInvoiceForm.ts`:
- جميع الحالات (`useState`) والمنطق: `handleContractChange`, `addItem`, `removeItem`, `updateItem`, `computedItems`, `totalExVat`, `totalVat`, `grandTotal`, `handleSave`, `missingFields`, `buyerAddress`, `isStandard`
- الثوابت `INVOICE_TYPES`, `ID_TYPE_LABELS` (أو نقلها إلى `invoiceTemplateUtils.ts` حيث `ID_TYPE_LABELS` موجود فعلاً)

**يبقى في الملف الأصلي**: JSX فقط (Dialog + Tabs + Form + Preview)

## التفاصيل التقنية

### الملفات الجديدة
| ملف | محتوى |
|-----|--------|
| `src/hooks/page/useCollectionData.ts` | أنواع + منطق حساب صفوف التحصيل + الملخص + الفلترة |
| `src/components/contracts/CollectionSummaryCards.tsx` | 4 بطاقات + شريط Progress |
| `src/hooks/page/useCreateInvoiceForm.ts` | حالات النموذج + الحسابات + handleSave |

### الملفات المعدّلة
| ملف | تعديل |
|-----|-------|
| `src/components/contracts/CollectionReport.tsx` | استيراد الهوك والبطاقات، حذف المنطق المستخرج |
| `src/components/invoices/CreateInvoiceFromTemplate.tsx` | استيراد الهوك، حذف المنطق المستخرج، نقل `INVOICE_TYPES` |
| `src/components/invoices/invoiceTemplateUtils.ts` | إضافة `INVOICE_TYPES` (اختياري — `ID_TYPE_LABELS` موجود فعلاً) |

### ملاحظات
- لا تغيير في السلوك أو الواجهة — إعادة هيكلة فقط
- التحقق من نجاح البناء بعد كل ملف

