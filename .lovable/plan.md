

## تحقق جنائي مباشر — نتائج فحص كل بند من التقرير

تم قراءة `AdminDashboard.tsx` (519 سطر) و `useYoYComparison.ts` و `usePaymentInvoices.ts` سطراً بسطر. النتائج:

---

### BUG-01 — طلب HTTP زائد للعقود اليتيمة
**✅ مؤكد**. السطر 54 يجلب كل العقود (`'all'`) عند اختيار سنة محددة فقط لحساب `orphanedContracts` (عقود بلا `fiscal_year_id`). طلب ثقيل لغرض بسيط.

**الإصلاح**: استعلام مخصص خفيف: `select('id, contract_number').is('fiscal_year_id', null).limit(50)` مع `staleTime` طويل.

---

### BUG-02 — collectionSummary يحسب عقوداً لا فواتير
**✅ مؤكد**. السطر 89-113: عقد فيه 11/12 فاتورة مدفوعة يُصنَّف "متأخر" بنفس وزن عقد فيه 0/12. النسبة = عقود منتظمة / إجمالي عقود — مضللة.

**الإصلاح**: حساب على مستوى الفاتورة: `paidDueInvoices / totalDueInvoices * 100`.

---

### BUG-03 — `yoy.isLoading` غائب من `isLoading`
**❌ غير صحيح**. `useYoYComparison` يُعيد `YoYResult` (كائن بيانات فقط، بلا `isLoading`). داخلياً يستخدم `useRawFinancialData` + `useMemo` — لا يوجد حقل `isLoading` للتضمين. البيانات تتوفر تزامنياً عبر `useMemo` بمجرد اكتمال الاستعلامات الفرعية. لا يوجد فلاش ملحوظ لأن `YoYBadge` يعرض `null` عندما `changePercent === null`.

**لا يحتاج إصلاح.**

---

### BUG-04 — `expiringContracts` بلا `useMemo`
**✅ مؤكد**. السطر 231-248: IIFE داخل JSX تُعاد في كل render. خفيفة الأثر (فلتر صغير) لكن غير نظيفة.

**الإصلاح**: استخراجها كـ `useMemo` مع dependency على `fyContracts`.

---

### BUG-05 — `contractualRevenue` يعتمد على `rent_amount` فقط
**🟡 ملاحظة وليست خطأ**. `rent_amount` هو الإيجار السنوي الإجمالي حسب تصميم الجدول. `payment_amount = rent_amount / payment_count`. استخدام `rent_amount` صحيح للإيرادات التعاقدية. المشكلة تظهر فقط إذا أُدخلت بيانات غير متسقة — وهذا خطأ بيانات لا خطأ كود.

**لا يحتاج إصلاح كودي.** يمكن إضافة validation عند إنشاء العقد.

---

### BUG-06 — `availableAmount` قد يكون سالباً للسنة المقفلة
**✅ مؤكد**. السطر 131: `isYearActive ? Math.max(0, netAfterZakat) : availableAmount` — للسنة المقفلة يُعرض `availableAmount` بدون `Math.max(0, ...)`.

**الإصلاح**: `Math.max(0, isYearActive ? netAfterZakat : availableAmount)`.

---

### BUG-07 — `allFiscalYears` مجلوب ولا يُستخدم
**❌ غير صحيح**. `allFiscalYears` مُستخدم فعلياً في:
- السطر 449: `{allFiscalYears.length >= 2 && (`
- السطر 460: `fiscalYears={allFiscalYears}`

التقرير أخطأ في هذا البند. الـ hook مطلوب لعرض مكون مقارنة السنوات.

**لا يحتاج إصلاح.**

---

### DOC-01 — التوثيق غير متزامن
**✅ مؤكد** لكنه منخفض الأولوية. يمكن تحديثه لاحقاً.

---

## ملخص التحقق

| # | الادعاء | النتيجة | يحتاج إصلاح؟ |
|---|---------|---------|-------------|
| BUG-01 | طلب HTTP زائد | ✅ مؤكد | نعم |
| BUG-02 | collectionSummary مضلل | ✅ مؤكد | نعم |
| BUG-03 | yoy.isLoading غائب | ❌ خاطئ | لا |
| BUG-04 | IIFE بلا useMemo | ✅ مؤكد | نعم |
| BUG-05 | rent_amount vs payment_amount | 🟡 ملاحظة | لا |
| BUG-06 | availableAmount سالب | ✅ مؤكد | نعم |
| BUG-07 | allFiscalYears غير مستخدم | ❌ خاطئ | لا |
| DOC-01 | توثيق متأخر | ✅ مؤكد | لاحقاً |

## خطة الإصلاح — 4 بنود فعلية

### التغييرات في `src/pages/dashboard/AdminDashboard.tsx`:

1. **BUG-01**: حذف السطر 54-55 (`useContractsByFiscalYear('all')` + `allContracts`). إضافة `useQuery` مخصص خفيف لجلب العقود اليتيمة فقط (`fiscal_year_id IS NULL`، أعمدة `id, contract_number` فقط، `limit(50)`, `staleTime: 300_000`). تحديث `orphanedContracts` لاستخدام النتيجة الجديدة.

2. **BUG-02**: تغيير `collectionSummary` من عد العقود إلى عد الفواتير المستحقة: `paidDueInvoices.length / totalDueInvoices.length * 100`. مع الحفاظ على عرض "عقد" في الواجهة مع تغيير المسمى إلى "فاتورة".

3. **BUG-04**: استخراج `expiringContracts` من IIFE إلى `useMemo(() => ..., [fyContracts])` قبل الـ JSX.

4. **BUG-06**: تغيير السطر 131 إلى `Math.max(0, isYearActive ? netAfterZakat : availableAmount)`.

