## تحليل شامل للـ 30 ملف اختبار الفاشلة

شغّلت المجموعة كاملة وجمعت 140 فشلاً موزّعة على 30 ملف. التصنيف الفعلي:

| الفئة | عدد الـ assertions الفاشلة | السبب الجذري |
|---|---|---|
| `dom-query` (getByText لا يجد نصوص) | 95 | اختبارات صفحات قديمة كُتبت قبل Page Hook Pattern + hooks/data — الصفحات أصبحت logic-less وتعرض skeleton عندما لا تُمَوّك الـ hooks الجديدة |
| `assertion` (قيم/استدعاءات لا تتطابق) | 27 | اختبارات لـ utils/PDF تتوقع توقيع API قديم (مثل `toast.success` بدل uiNotify، أو `uploadInvoiceToStorage` يُرجع null لأن الـ storage mock تغيّر) |
| `api-mismatch` (TypeError) | 13 | `mockedUseX.mockReturnValue is not a function` — استيراد الـ hook لم يعد default export، و `supabase.channel is not a function` لأن mock العميل ناقص |
| `other` (STACK_TRACE_ERROR) | 5 | فشل تحميل الملف أصلاً (ZatcaManagement, WaqifDashboard) — اختبارات تستورد رموز محذوفة/منقولة |

### 1) ما يجب حذفه (قديم بحت — لا قيمة في إعادة كتابته)

اختبارات صفحات تتحقق فقط من ظهور labels ثابتة دون منطق فعلي. القيمة الحقيقية موجودة الآن في `hooks/page/` (المنطق) و `hooks/data/` (Supabase). تكرار getByText على رؤوس صفحات RTL لا يضيف ضماناً ويكسر مع كل إعادة تسمية.

```
src/pages/beneficiary/AccountsViewPage.test.tsx
src/pages/beneficiary/BeneficiaryDashboard.test.tsx
src/pages/beneficiary/BeneficiaryMessagesPage.test.tsx
src/pages/beneficiary/BylawsViewPage.test.tsx
src/pages/beneficiary/ContractsViewPage.test.tsx
src/pages/beneficiary/FinancialReportsPage.test.tsx
src/pages/beneficiary/InvoicesViewPage.test.tsx
src/pages/beneficiary/PropertiesViewPage.test.tsx
src/pages/beneficiary/SupportPage.test.tsx
src/pages/dashboard/AccountsPage.test.tsx
src/pages/dashboard/AdminDashboard.test.tsx
src/pages/dashboard/AuditLogPage.test.tsx
src/pages/dashboard/BylawsPage.test.tsx
src/pages/dashboard/ContractsPage.test.tsx
src/pages/dashboard/InvoicesPage.test.tsx
src/pages/dashboard/MessagesPage.test.tsx
src/pages/dashboard/PropertiesPage.test.tsx
src/pages/dashboard/ReportsPage.test.tsx
src/pages/dashboard/SettingsPage.test.tsx
src/pages/dashboard/ZatcaManagementPage.test.tsx
src/pages/waqif/WaqifDashboard.test.tsx
src/components/common/ExportMenu.test.tsx
src/components/common/finance/NoPublishedYearsNotice.test.tsx
```

**المجموع: 23 ملف للحذف.** المنطق الفعلي مُغطّى بـ `useXPage.test.ts` (موجودة) + اختبار التكامل الجديد للـ PDF.

### 2) ما يجب إصلاحه (له قيمة حقيقية)

سبعة ملفات تختبر منطقاً جوهرياً ويستحق التصحيح بدلاً من الحذف:

| الملف | السبب | الإصلاح المقترح |
|---|---|---|
| `src/pages/beneficiary/DisclosurePage.test.tsx` | الإفصاح السنوي = ميزة شرعية حرجة | تحديث mocks لـ `useDisclosurePage` |
| `src/pages/beneficiary/MySharePage.test.tsx` | حصة المستفيد = منطق توزيع حساس | إضافة `supabase.channel` mock في setup |
| `src/utils/pdf/reports/annualReport.test.ts` | يولّد PDF التقرير السنوي | تحديث assertion للـ uiNotify الجديد |
| `src/utils/pdf/invoices/invoice.test.ts` | ZATCA invoice generation | إصلاح mock `uploadInvoiceToStorage` |
| `src/utils/pdf/invoices/paymentInvoice.test.ts` | ZATCA payment invoice | نفس السبب |
| `src/hooks/page/admin/dashboard/useSupportDashboardPage.test.ts` | منطق تذاكر الدعم | محاذاة البيانات الوهمية مع الـ query الجديد |
| `src/hooks/page/admin/financial/useAccountsPage.test.ts` | حسابات مالية | محاذاة الأرصدة الوهمية مع المُحدّث |

### 3) خطة التنفيذ على دفعتين

**الدفعة A — حذف (5 دقائق):**
- حذف الـ 23 ملف أعلاه دفعة واحدة
- التحقق: `vitest run` يجب أن يُظهر 7 ملفات فاشلة فقط

**الدفعة B — إصلاح الـ 7 الجوهرية:**
1. إضافة `supabase.channel`/`removeChannel` للـ mock العام في `src/test/setup.ts` (يحل MySharePage + أي مستقبلي)
2. تحديث `annualReport.test.ts`: استبدال `toast.success` بـ تحقق من `uiNotify` (نفس نمط `pdfReportsIntegration.test.ts` الذي بنيناه أمس)
3. إصلاح اختباري الفواتير: mock `@/lib/storage/invoiceStorage` بإرجاع URL ثابت
4. `DisclosurePage`: استبدال getByText بـ `screen.findByRole` على heading + mock `useDisclosurePage` كاملاً
5. `useSupportDashboardPage` + `useAccountsPage`: مزامنة fixtures مع شكل بيانات الـ hook الحالي (قراءة الـ hook + تعديل الـ mock data)

**معيار النجاح النهائي:**
- `vitest run` → 0 ملفات فاشلة
- لا تخفيض في تغطية المنطق (المنطق الحقيقي في `hooks/page/*` و `hooks/data/*` يبقى مُختبَراً)

### 4) ما لن أفعله

- لن أُعيد كتابة اختبارات smoke للصفحات. سياسة المشروع (`mem://testing/automated-test-suite-strategy`) تفضّل اختبار الـ hooks لأن المكونات logic-less.
- لن ألمس أي كود إنتاجي.
- لن أضيف `it.skip` — حسب اختيارك: حذف صريح.

عند الموافقة، أُنفّذ الدفعة A ثم B في رسالة واحدة وأرفق تقرير `vitest` نهائي.