

## تحليل التطبيق — التحسينات المطلوبة

بعد فحص شامل للكود، المشروع في حالة جيدة جداً من حيث البنية والأداء. فيما يلي التحسينات المكتشفة مرتبة حسب الأولوية:

---

### 1. إزالة `any` من مكونات فواتير الدفعات (أمان الأنواع)

**الملفات المتأثرة:**
- `src/components/contracts/payment-invoices/PaymentInvoiceDesktopTable.tsx`
- `src/components/contracts/payment-invoices/PaymentInvoiceMobileCards.tsx`
- `src/components/contracts/payment-invoices/PaymentInvoiceToolbar.tsx`

**المشكلة:** `type Invoice = any` — يضعف أمان TypeScript ويخفي أخطاء محتملة.

**الحل:** استبدال `any` بنوع `PaymentInvoice` المستورد من `@/types/database` أو إنشاء interface مناسب يعكس بنية البيانات الفعلية.

---

### 2. تكرار الـ `id` في `htmlFor` بنموذج المستفيد

**الملف:** `src/components/beneficiaries/BeneficiaryFormDialog.tsx` (سطر 74-75)

**المشكلة:** حقل الهاتف يستخدم `id="beneficiary-form-dialog-field-1"` وحقل البريد يستخدم `id="beneficiary-form-dialog-field-2"`، بينما `Label htmlFor` يشير لـ `field-2` و `field-3`. هذا عدم تطابق يؤثر على إمكانية الوصول (Accessibility).

**الحل:** توحيد الـ `id` مع `htmlFor` لكل حقل.

---

### 3. تحسين `advanceRequests.filter` المكرر في لوحة التحكم

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` (سطر 179)

**المشكلة:** `advanceRequests.filter(r => r.status === 'pending').length` يُحسب داخل JSX مباشرة — يُعاد حسابه مع كل render.

**الحل:** لفه بـ `useMemo` أو حسابه مرة واحدة في متغير خارج JSX.

---

### 4. إنشاء دالة `greeting` مستخرجة من JSX

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` (سطور 156-164)

**المشكلة:** IIFE داخل JSX لحساب التحية — يصعب قراءته ويُعاد تنفيذه مع كل render.

**الحل:** استخراجه إلى `useMemo` أو ثابت محسوب خارج JSX.

---

### 5. تحسين `useDashboardRealtime` — eslint-disable لـ deps

**الملف:** `src/hooks/ui/useDashboardRealtime.ts` (سطر 35-36)

**المشكلة:** `eslint-disable-next-line react-hooks/exhaustive-deps` مع spread `...tables` في dependency array — قد يسبب إعادة اشتراك غير مرغوبة إذا تغيّر مرجع المصفوفة.

**الحل:** تحويل `tables` إلى `JSON.stringify` key أو استخدام `useRef` لتثبيت المرجع.

---

### 6. توحيد staleTime للاستعلامات المتشابهة

**المشكلة:** بعض الاستعلامات المتشابهة تستخدم `staleTime` مختلفة:
- `useProperties` — يعتمد على الافتراضي (5 دقائق من queryClient)
- `useContractAllocations` — `60_000`
- `useFiscalYears` — `60_000`
- `useAdvanceRequests` — `10_000`

**الحل:** إنشاء ثوابت staleTime مركزية:
```text
STALE_STATIC    = 5 * 60_000   // بيانات نادرة التغيّر (عقارات، إعدادات)
STALE_FINANCIAL = 60_000       // بيانات مالية
STALE_REALTIME  = 10_000       // بيانات حساسة (سلف، رسائل)
```

---

### 7. إضافة `ErrorBoundary` حول `CollectionSummaryCard` و `RecentContractsCard`

**الملف:** `src/pages/dashboard/AdminDashboard.tsx`

**المشكلة:** المكونات الأخرى below-the-fold ملفوفة بـ `ErrorBoundary` + `Suspense`، لكن `CollectionSummaryCard` و `RecentContractsCard` ليسا كذلك.

**الحل:** إضافة `ErrorBoundary` حولهما للاتساق ومنع انهيار الصفحة بالكامل.

---

### 8. تحسين Accessibility — أزرار الإجراءات السريعة

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` (سطور 209-288)

**المشكلة:** أزرار الإجراءات السريعة ملفوفة بـ `<Link>` ثم `<Button>` — عنصران تفاعليان متداخلان (interactive element nesting) وهو مخالف لمعايير الوصول.

**الحل:** استخدام `<Button asChild>` مع `<Link>` أو تحويل الأزرار لعناصر `Link` مع تنسيق Button.

---

### ملخص الأولويات

| الأولوية | التحسين | التأثير |
|----------|---------|---------|
| عالية | إزالة `any` من فواتير الدفعات | أمان الأنواع |
| عالية | إصلاح تداخل `Link`/`Button` | إمكانية الوصول |
| متوسطة | إصلاح `id`/`htmlFor` في نموذج المستفيد | إمكانية الوصول |
| متوسطة | توحيد ثوابت `staleTime` | صيانة الكود |
| متوسطة | استخراج IIFE + `useMemo` للحسابات | أداء |
| منخفضة | `ErrorBoundary` للمكونات الناقصة | استقرار |
| منخفضة | تثبيت مرجع `tables` في Realtime | منع re-subscribe |

### خطة التنفيذ

أبدأ بالتحسينات ذات الأولوية العالية (1، 8، 2) ثم المتوسطة (6، 3، 4) ثم المنخفضة (7، 5). كل تحسين مستقل ولا يعتمد على الآخر.

