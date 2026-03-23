

# فحص جنائي: قاعدة "السنة من تاريخ العقد" وترحيل الدفعات

---

## فهم القاعدة التجارية

المستخدم يوضح قاعدتين أساسيتين:

1. **سنة العقد تُحسب من تاريخ بداية العقد** — عقد يبدأ 1 يناير 2025 سنته يناير-ديسمبر 2025، بغض النظر عن حدود السنة المالية (أكتوبر-أكتوبر مثلاً)
2. **عند إقفال السنة المالية**: يُقفل على آخر دفعة فعلية تم سدادها، والباقي يُرحّل للسنة التالية

---

## تحليل الوضع الحالي

### ✅ ما يعمل بشكل صحيح

| المكون | المنطق | الحالة |
|--------|--------|--------|
| `generate_contract_invoices` (SQL) | يحسب `due_date` من `start_date + interval` | ✅ صحيح — يعتمد على تاريخ العقد |
| `allocateContractToFiscalYears` (TS) | يولّد due dates من contract start_date ويوزعها على السنوات المالية | ✅ صحيح |
| `CollectionReport` | يستخدم `allocateContractToFiscalYears` لمعرفة الدفعات المخصصة لكل سنة | ✅ صحيح |
| `MonthlyAccrualTable` (الجديد) | يعرض الفواتير الفعلية بشهر استحقاقها | ✅ صحيح |
| `pay_invoice_and_record_collection` RPC | يسجل الدخل + يحدث paid_months ذرياً | ✅ صحيح |

### ⚠️ مشاكل مكتشفة

#### تناقض #1: `getPaymentStatus` في `helpers.ts` — لا يعرف السنة المالية

**سطر 54-70:**
```text
const totalMonths = (today - start) بالأشهر
if (annual) expectedPayments = floor(totalMonths / 12)
overdue = expectedPayments - paidMonths
```

**المشكلة:** يحسب الدفعات المتوقعة من `today` بشكل مطلق — لا يراعي حدود السنة المالية ولا ما تم ترحيله. عقد سنوي بدأ يناير 2024 وتم إقفال سنة 2024 بدفعة واحدة مسددة → في 2025 يحسب `expectedPayments = 1` (floor(12/12)) لكن `paidMonths` قد يكون 0 في السنة الجديدة إذا لم تُرحّل القيمة.

**الخطورة:** متوسطة — يؤثر على مؤشر "متأخر/منتظم" في صفحة الوحدات.

#### تناقض #2: `ContractStatsCards` — بطاقة "الإيرادات التعاقدية" تجمع كل العقود

**سطر 372:**
```text
const totalRent = contracts.reduce(sum + rent_amount)
```

**المشكلة:** تجمع `rent_amount` الكامل لكل عقد حتى لو جزء منه فقط يقع ضمن السنة المالية المحددة. عقد سنوي 120,000 ر.س يمتد من يناير 2025 إلى ديسمبر 2025 في سنة مالية أكتوبر 2024 - أكتوبر 2025 → يجب أن تُعرض القيمة المخصصة فقط (9 أشهر = 90,000)، لكنها تعرض 120,000 كاملة.

**الخطورة:** متوسطة — يعطي صورة مالية مضخمة.

#### تناقض #3: `IncomeMonthlyChart` — المتوقع الشهري = `rent/12` خطي

**المشكلة:** لا يعكس تواريخ الاستحقاق الفعلية. عقد سنوي بدفعة واحدة يظهر كـ 10,000/شهر بدلاً من 120,000 في شهر الاستحقاق. هذا يتناقض مع جدول الاستحقاقات الذي أصبح يعتمد على الفواتير الفعلية.

**الخطورة:** منخفضة — مفاهيمي، يعتمد على ما إذا كان الرسم يمثل "التوزيع الخطي" أم "الاستحقاق الفعلي".

#### تناقض #4: الإقفال لا يرحّل الفواتير غير المسددة صراحةً

**المنطق الحالي:** عند إقفال السنة المالية (`close_fiscal_year` RPC)، يتم أخذ لقطة مالية (snapshot) لكن **لا يتم ترحيل الفواتير غير المسددة** للسنة التالية. الفواتير تبقى مربوطة بسنتها المالية الأصلية (عبر `fiscal_year_id`).

**هل هذا مشكلة؟** الفواتير مربوطة بالعقد وبالسنة المالية عبر `due_date`. عند عرض السنة الجديدة، الفواتير التي `due_date` يقع فيها ستظهر تلقائياً. لكن فاتورة `overdue` من السنة السابقة تبقى في السنة القديمة — لا تظهر في الجديدة.

**القاعدة التجارية:** "يُقفل على آخر دفعة مسددة ويُرحّل الباقي" — يعني الفواتير غير المسددة يجب أن تنتقل للسنة التالية عند الإقفال.

---

## خطة الإصلاح

### الإصلاح 1: `getPaymentStatus` — استخدام الفواتير كمصدر حقيقة

بدلاً من حساب `expectedPayments` رياضياً، يجب أن يعتمد على عدد الفواتير غير المسددة (`overdue` status) من `payment_invoices`.

| الملف | التغيير |
|-------|---------|
| `src/components/properties/units/helpers.ts` | إضافة دالة جديدة `getPaymentStatusFromInvoices(contractId, invoices)` تحسب من الفواتير مباشرة |
| `src/components/properties/PropertyUnitsDialog.tsx` | تمرير `paymentInvoices` واستخدام الدالة الجديدة |

### الإصلاح 2: `ContractStatsCards` — استخدام `allocated_amount` من `contract_fiscal_allocations`

| الملف | التغيير |
|-------|---------|
| `src/pages/dashboard/ContractsPage.tsx` | حساب `totalRent` و `activeRent` من `allocated_amount` عند وجود سنة مالية محددة |

### الإصلاح 3: `IncomeMonthlyChart` — استخدام الفواتير الفعلية

| الملف | التغيير |
|-------|---------|
| `src/components/dashboard/IncomeMonthlyChart.tsx` | المتوقع الشهري يُحسب من `paymentInvoices` (مبلغ الفاتورة في شهر استحقاقها) بدلاً من `rent/12` |
| `src/pages/dashboard/AdminDashboard.tsx` | تمرير `paymentInvoices` للرسم البياني |

### الإصلاح 4: ترحيل الفواتير عند الإقفال (يحتاج migration)

عند إقفال السنة المالية، الفواتير غير المسددة (`pending`/`overdue`) يجب أن يتم تحديث `fiscal_year_id` لها ليشير للسنة التالية.

| الملف | التغيير |
|-------|---------|
| Migration SQL | تعديل `close_fiscal_year` RPC ليُرحّل فواتير `pending`/`overdue` للسنة التالية |

**ملاحظة مهمة:** هذا التغيير يحتاج حذراً — الفواتير المربوطة بـ ZATCA (موقّعة/مرسلة) لا يجب تعديل `fiscal_year_id` لها. فقط الفواتير التي `zatca_status = 'not_submitted'`.

---

## ملخص الملفات

```text
1. src/components/properties/units/helpers.ts       — إضافة getPaymentStatusFromInvoices
2. src/components/properties/PropertyUnitsDialog.tsx — استخدام الدالة الجديدة
3. src/pages/dashboard/ContractsPage.tsx             — حساب totalRent من allocated_amount
4. src/components/dashboard/IncomeMonthlyChart.tsx   — المتوقع من الفواتير
5. src/pages/dashboard/AdminDashboard.tsx            — تمرير paymentInvoices
6. Migration SQL                                     — ترحيل فواتير عند الإقفال
```

