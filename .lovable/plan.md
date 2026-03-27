

## تقسيم الملفات الكبيرة المتبقية (5 ملفات فوق 300 سطر)

### الملفات المستهدفة

| الملف | السطور | التقسيم |
|-------|--------|---------|
| `PaymentInvoicesTab.tsx` | 375 | 4 مكونات فرعية |
| `ContractFormDialog.tsx` | 387 | 3 مكونات فرعية |
| `core.ts` (PDF) | 355 | ملفين مساعدين |
| `CreateInvoiceFromTemplate.tsx` | 347 | 3 مكونات فرعية |
| `GlobalSearch.tsx` | 324 | hook + مكون فرعي |

---

### 1. `src/components/contracts/PaymentInvoicesTab.tsx` → 375 سطر

المنطق مفصول بالفعل في `usePaymentInvoicesTab`. الملف JSX ضخم بسبب عرض الجوال + سطح المكتب.

**مكونات جديدة** في `src/components/contracts/payment-invoices/`:
- **`PaymentInvoiceSummaryCards.tsx`** — بطاقات الملخص الأربع + شريط التحصيل (سطر 108-149)
- **`PaymentInvoiceToolbar.tsx`** — البحث + الفلاتر + أزرار التوليد والتصدير (سطر 151-198)
- **`PaymentInvoiceMobileCards.tsx`** — عرض البطاقات للجوال (سطر 229-280)
- **`PaymentInvoiceDesktopTable.tsx`** — جدول سطح المكتب (سطر 282-367)

**الملف الأصلي** يبقى كمنسّق يجمع المكونات + dialogs الدفع/المعاينة.

---

### 2. `src/components/contracts/ContractFormDialog.tsx` → 387 سطر

المنطق مفصول في `useContractFormDialog`. الملف JSX ضخم بسبب أقسام النموذج المتعددة.

**مكونات جديدة** في `src/components/contracts/contract-form/`:
- **`ContractRentalModeSection.tsx`** — اختيار نوع التأجير + اختيار الوحدات/التعدد + التسعير (سطر 97-242)
- **`ContractPaymentSection.tsx`** — نوع الدفع + VAT + ملخص الدفعة + تنبيه السنوات المالية (سطر 263-365)
- **`ContractMultiPreview.tsx`** — معاينة أرقام العقود المتعددة (سطر 317-329)

**الملف الأصلي** يبقى كـ Dialog wrapper مع الحقول الأساسية (رقم العقد، العقار، المستأجر، التواريخ، الحالة).

---

### 3. `src/utils/pdf/core.ts` → 355 سطر

ملف مساعد يحتوي: تحميل خطوط + header/footer + styles + factory functions.

**ملفات جديدة**:
- **`src/utils/pdf/pdfFonts.ts`** — `toBase64`, `fetchFontWithRetry`, `loadArabicFont`, `isValidLogoUrl`, `loadLogoBase64`, `fontCache` (~70 سطر)
- **`src/utils/pdf/pdfLayout.ts`** — `addHeader`, `addHeaderToAllPages`, `addPageBorder`, `addFooter` (~100 سطر)

**`core.ts`** يبقى كنقطة تصدير مركزية: re-exports من الملفين + types + `createPdfDocument` + `finalizePdf` + table styles + `addSectionTitle` (~180 سطر). هذا يضمن عدم كسر أي import موجود.

---

### 4. `src/components/invoices/CreateInvoiceFromTemplate.tsx` → 347 سطر

المنطق مفصول في `useCreateInvoiceForm`. الملف JSX ضخم بسبب النموذج + جدول البنود + المعاينة.

**مكونات جديدة** في `src/components/invoices/create-invoice/`:
- **`InvoiceFormFields.tsx`** — الحقول الأساسية + ربط العقد/العقار + بيانات المشتري (سطر 96-156)
- **`InvoiceItemsTable.tsx`** — جدول البنود + الخصومات/الإضافات + الإجماليات (سطر 158-260)
- **`InvoiceFormFooter.tsx`** — تحذيرات الحقول الناقصة + أزرار الحفظ (سطر ~260-290)

**الملف الأصلي** يبقى كـ Dialog مع Tabs (النموذج + المعاينة).

---

### 5. `src/components/GlobalSearch.tsx` → 324 سطر

**ملفات جديدة**:
- **`src/hooks/page/useGlobalSearch.ts`** — منطق البحث: state + debounce + Supabase queries + keyboard shortcuts (~120 سطر)
- مكون `SearchResults` موجود بالفعل كمكون داخلي — يُستخرج إلى **`src/components/search/SearchResults.tsx`**

**`GlobalSearch.tsx`** يبقى كمكون عرض فقط (~150 سطر) يستخدم `useGlobalSearch` + `SearchResults`.

---

### ملاحظات تقنية
- جميع imports الموجودة تبقى تعمل بدون تغيير (الملفات الأصلية تبقى كنقاط دخول)
- لا تغيير في المنطق أو السلوك — فقط نقل كود
- الهدف: كل ملف أقل من **250 سطر**
- المكونات المستبعدة: `paymentInvoiceShared.ts` (استثناء مؤكد)، `sidebar.tsx` (shadcn/ui)

