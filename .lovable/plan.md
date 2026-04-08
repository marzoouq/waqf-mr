

# خطة تنفيذ إصلاحات الجولة 10 — لوحات المستفيد والناظر والمحاسب

## ملخص التحقق

تم التحقق من 8 ادعاءات مقابل الكود الفعلي وقاعدة البيانات. **4 مشاكل حقيقية مؤكدة + 1 تحسين بسيط**.

---

## المشاكل المؤكدة والإصلاحات

### 🔴 1. لوحة المحاسب تفقد 45 فاتورة متأخرة (خطأ بيانات مؤكد)

**الملف:** `src/hooks/page/admin/dashboard/useAccountantDashboardData.ts` سطر 58

الفلتر الحالي: `inv.status === 'pending' && inv.due_date < today` يُرجع **0 نتائج** لأن الـ cron الموجود في قاعدة البيانات يُحدّث حالة الفواتير من `pending` إلى `overdue` تلقائياً. يوجد حالياً 45 فاتورة بحالة `overdue` لا تظهر للمحاسب.

**الإصلاح:** تغيير الفلتر إلى `inv.status === 'overdue' || (inv.status === 'pending' && inv.due_date < today)` لالتقاط كلا الحالتين.

---

### 🔴 2. `useWaqifDashboardPage` يكرر منطق تحويل المصروفات يدوياً

**الملف:** `src/hooks/page/beneficiary/useWaqifDashboardPage.ts` سطور 32-38

يكتب loop يدوي `forEach(e => result[e.expense_type] = e.total)` بينما `useBeneficiaryFinancials` يُنجز نفس العمل عبر `toExpenseRecord()`. كل صفحات المستفيد الأخرى تستخدم `useBeneficiaryFinancials` إلا هذه.

**الإصلاح:** استيراد `useBeneficiaryFinancials` واستخدام `fin.expensesByTypeExcludingVat` و `fin.totalIncome` و `fin.totalExpenses` و `fin.availableAmount` بدلاً من الاستخراج اليدوي. هذا يحذف ~10 سطور مكررة.

---

### 🟠 3. `fetchContracts` في `useMySharePage` يجلب كل العقود بدون فلتر سنة

**الملف:** `src/hooks/page/beneficiary/useMySharePage.ts` سطور 66-72

الاستعلام لا يُقيّد بـ `fiscal_year_id`، مما يجعل PDF حصة المستفيد يعرض عقوداً من كل السنوات.

**الإصلاح:** إضافة فلتر `.eq('fiscal_year_id', fiscalYearId)` عندما تكون السنة المالية محددة (ليست `all`). يتطلب إضافة `fiscalYearId` إلى مصفوفة deps الخاصة بـ `useCallback`.

---

### 🟠 4. `useWaqifDashboardPage` يجلب 5 استعلامات إضافية يمكن الاستغناء عن بعضها

**الملف:** `src/hooks/page/beneficiary/useWaqifDashboardPage.ts` سطور 40-46

الواقف يجلب `properties`, `contracts`, `allUnits`, `paymentInvoices`, `contractAllocations` بشكل منفصل لحساب التحصيل والإشغال. بعض هذه البيانات مطلوب فعلاً (العقارات للـ overviewStats، العقود للإيرادات التعاقدية). لكن `paymentInvoices` تُجلب بدون تقييد صحيح عندما `fiscalYearId` غير معرّف.

**الإصلاح الآمن (بدون تغيير RPC):** التأكد من أن `usePaymentInvoices` تتلقى `fiscalYearId` الفعلي وليس `'all'` كقيمة fallback. السطر 43 يمرر `fiscalYearId || 'all'` — يجب أن يكون `fiscalYearId ?? undefined` ليتسق مع باقي الفلاتر.

---

### 🟡 5. التحية والتاريخ في لوحة الواقف لا تتحدث

**الملف:** `src/hooks/page/beneficiary/useWaqifDashboardPage.ts` سطر 92-102

`useMemo(() => {...}, [])` — مصفوفة deps فارغة. إذا بقي المستخدم من الصباح للمساء، التحية لن تتغير.

**الإصلاح:** لا نضيف timer (تعقيد غير مبرر). بدلاً من ذلك، نزيل `useMemo` ونترك الحساب يُعاد مع كل render (خفيف جداً — 5 عمليات Date). هذا يضمن تحديث التحية عند أي تفاعل مع الصفحة.

---

## الملفات المتأثرة

| # | الملف | نوع التعديل |
|---|-------|------------|
| 1 | `useAccountantDashboardData.ts` | إصلاح فلتر overdue |
| 2 | `useWaqifDashboardPage.ts` | استخدام `useBeneficiaryFinancials` + إصلاح fiscalYearId + إزالة useMemo للتحية |
| 3 | `useMySharePage.ts` | إضافة فلتر fiscal_year_id للعقود |

**إجمالي: 3 ملفات. صفر تغيير في السلوك الخارجي ما عدا #1 الذي يُصلح بيانات مفقودة.**

---

## البنود المرفوضة

| # | الادعاء | السبب |
|---|---------|-------|
| 7 | استخراج `useBeneficiaryPageBase` | تحسين اختياري — كل hook يجلب من cache، والنمط واضح ومُتسق |
| 8 | عدم تناسق eager vs lazy للعقود | كل صفحة لها سياق مختلف — eager مبرر للإفصاح، lazy مبرر لـ PDF |

