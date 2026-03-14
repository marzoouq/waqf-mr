

# إصلاح الفواتير الضريبية + تحسينات لوحة التحكم

## تحقق من البنود

| # | البند | الحكم | السبب |
|---|-------|-------|-------|
| INV-CRIT-1 | رفع PDF من client لـ Storage | **حقيقي** — لكن Storage RLS تحمي الكتابة. التلاعب بالمسار خطر حقيقي | سطر 149 |
| INV-CRIT-2 | لا واجهة للدفع الجزئي | **حقيقي** — `partially_paid` status موجود لكن لا يمكن الوصول إليه | سطر 329 |
| INV-CRIT-3 | `markPaid.isPending` يُعطّل كل الأزرار | **حقيقي** — `loadingInvoiceId` موجود للـ PDF لكن غير مستخدم للتسديد | سطر 329 |
| INV-CRIT-4 | `storage.remove()` بدون error handling | **حقيقي** — فشل الحذف يكسر الحفظ | سطر 131 |
| INV-HIGH-1 | `paidAmount` لـ partially_paid قد يكون 0 | **حقيقي** — `paid_amount` nullable | سطر 53 |
| INV-HIGH-2 | search/filter لا يُصفَّر currentPage | **حقيقي** | سطر 59-75 |
| INV-HIGH-3 | limit(1000) صامت | **ملاحظة** — نظام التنبيه موجود في hooks أخرى لكن ليس هنا |
| INV-HIGH-4 | ZATCA QR timestamp = وقت التحميل | **حقيقي** — مخالف لاشتراطات ZATCA | سطر 117 |
| INV-HIGH-5 | filteredInvoices بدون debounce | **ملاحظة** — `useMemo` كافٍ لمعظم الحالات |
| INV-MED-1 | لا عمود ضريبة في الجدول | **تحسين UX** |
| INV-MED-2 | `e.message` مباشرة في ZATCA | **حقيقي** — يُسرّب رسائل تقنية | سطر 136,156,175 |
| INV-MED-3 | فاتورة بمبلغ 0 مقبولة | **حقيقي** | سطر 124 |
| DASH-NEW-1 | netAfterZakat غائب عن Stats | **تحسين UX** — خارج نطاق هذه الجولة |
| DASH-NEW-2 | ChartSkeleton مستطيل واحد | **حقيقي** — layout shift | سطر 30-34 |

## الإصلاحات المعتمدة (11 تعديل في 5 ملفات)

### ملف 1: `src/utils/pdf/paymentInvoice.ts`

**INV-CRIT-1 (جزئي):** sanitize مسار الملف — استبدال أي `/` أو `..` في `invoiceNumber` بـ `_` قبل بناء `storagePath`. النقل الكامل لـ Edge Function خارج نطاق هذه الجولة.

**INV-HIGH-4:** تغيير `timestamp: new Date().toISOString()` إلى `timestamp: invoice.dueDate` (أو `invoice.paidDate` إذا مدفوعة).

### ملف 2: `src/components/contracts/PaymentInvoicesTab.tsx`

**INV-CRIT-2:** إضافة Dialog للدفع الجزئي — عند الضغط على "تسديد" يظهر Dialog يسمح بإدخال المبلغ المدفوع (مبدأياً = المبلغ الكامل). إذا كان المبلغ < الإجمالي → يُرسل كـ `paidAmount`.

**INV-CRIT-3:** إضافة `payingInvoiceId` state — `disabled={payingInvoiceId === inv.id}` بدلاً من `markPaid.isPending`.

**INV-HIGH-1:** إصلاح حساب `paidAmount` — استخدام `Number(i.paid_amount ?? (i.status === 'paid' ? i.amount : 0))`.

**INV-HIGH-2:** إضافة `useEffect` يُعيد `setCurrentPage(1)` عند تغيير `filter` أو `search`.

**INV-MED-1:** إضافة عمود "الضريبة" في الجدول يعرض `vat_amount` إذا > 0.

### ملف 3: `src/pages/dashboard/InvoicesPage.tsx`

**INV-CRIT-4:** تغليف `storage.remove()` بـ `try/catch` مستقل — فشل الحذف لا يوقف الحفظ.

**INV-MED-3:** إضافة فحص `parseFloat(formData.amount) > 0` قبل الحفظ.

### ملف 4: `src/pages/dashboard/ZatcaManagementPage.tsx`

**INV-MED-2:** استبدال `toast.error(e.message)` بـ `toast.error(getSafeErrorMessage(e))` في 3 مواضع.

### ملف 5: `src/pages/dashboard/AdminDashboard.tsx`

**DASH-NEW-2:** تحديث `ChartSkeleton` لعرض مستطيلين في grid 2 أعمدة بدلاً من مستطيل واحد.

