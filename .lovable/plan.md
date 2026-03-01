

# خطة إصلاح الأخطاء المتبقية (3 نقاط)

## نظرة عامة
بقي خطأان لم يُصلحا + ملاحظة UX جانبية من تصفير القيم في السنوات غير المغلقة.

---

## 1. BUG-21 — منع استعلام الفواتير عند عدم وجود سنوات منشورة

**الملف:** `src/pages/beneficiary/InvoicesViewPage.tsx` سطر 26

**التغيير:** نقل فحص `noPublishedYears` قبل `isError`، واضافة شرط لمنع الاستعلام غير الضروري.

لا يمكن اضافة `enabled` مباشرة لأن `useInvoicesByFiscalYear` هو hook مشترك يُستخدم في 4 صفحات. الحل الأنظف: عند `noPublishedYears`، تمرير `fiscalYearId = '__none__'` بدلاً من القيمة الفعلية — الـ hook يحتوي بالفعل على `enabled: fiscalYearId !== '__none__'` مما يمنع تنفيذ الاستعلام.

```text
قبل: useInvoicesByFiscalYear(fiscalYearId)
بعد: useInvoicesByFiscalYear(noPublishedYears ? '__none__' : fiscalYearId)
```

بالإضافة لنقل فحص `noPublishedYears` ليكون قبل `isError` في ترتيب الـ early returns.

---

## 2. BUG-13 — تصفية السنوات المنشورة فقط في CarryforwardHistoryPage

**الملف:** `src/pages/beneficiary/CarryforwardHistoryPage.tsx`

**التغيير:** اضافة `.eq('published', true)` لاستعلام `fiscal_years` وتحديث `queryKey` ليعكس الفلتر.

```text
قبل: .select('id, label').order(...)
بعد: .select('id, label').eq('published', true).order(...)

queryKey: ['fiscal_years_published_all']
```

رغم ان RLS يحمي البيانات المالية، الا ان اسماء السنوات المسودة (labels) لا يجب ان تظهر للمستفيد.

---

## 3. ملاحظة BUG-08 — تحسين UX عند السنوات غير المغلقة

**الملف:** `src/pages/beneficiary/BeneficiaryDashboard.tsx`

عند `waqfRevenue = 0` و `availableAmount = 0` في السنة غير المغلقة، البطاقات المالية تعرض أصفار بلا تفسير. الحل: اضافة شريط تنبيه خفيف اسفل البطاقات عندما تكون السنة المختارة غير مقفلة، يقول: "الأرقام النهائية (حصص الريع والتوزيعات) ستتوفر بعد إقفال السنة المالية".

يتطلب فحص حالة السنة المالية الحالية — يمكن الحصول عليها من `useFiscalYear` context أو من `useFinancialSummary`.

---

## ملخص الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `src/pages/beneficiary/InvoicesViewPage.tsx` | تمرير `'__none__'` عند `noPublishedYears` + اعادة ترتيب early returns |
| `src/pages/beneficiary/CarryforwardHistoryPage.tsx` | اضافة `.eq('published', true)` + تحديث queryKey |
| `src/pages/beneficiary/BeneficiaryDashboard.tsx` | اضافة شريط تنبيه للسنوات غير المقفلة |

**الإجمالي:** 3 ملفات، 3 تعديلات

