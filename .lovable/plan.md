
# خطة الإصلاح النهائية — المشاكل المتبقية فعلياً

## نتيجة التحقق الصادقة

بعد فحص الكود الحالي بدقة، تبين أن **معظم إصلاحات الجولات 1-8 مُطبَّقة فعلاً** (تقرير المراجعة كان يرجع لـ commit hashes قديمة). المشاكل المتبقية فعلياً هي **4 فقط**:

| # | المشكلة | الحالة |
|---|---------|--------|
| H1 | `paidMonths = 0` عند غياب الدفع | مُصلَح (سطر 265) |
| H2 | `handleSaveEdit` يُحدّث `payment_amount` فقط | مُصلَح (سطر 463-468) |
| H3 | `shareBase` من stored values للسنوات المُقفَلة | مُصلَح (سطر 111-126) |
| H4 | `invalidateQueries` للعقود بعد الإقفال | مُصلَح (سطر 412-414) |
| H5 | VAT keywords مُنقَّحة | مُصلَح (سطر 150) |
| H6 | المحاسب يُرسل إشعارات | مُصلَح (سطر 94) |
| H7 | channel name فريد | مُصلَح (سطر 30) |
| G1 | شاشة خطأ بدل `NoPublishedYearsNotice` | مُصلَح (سطر 60-70) |
| G2 | حساب الحصص بالتناسب | مُصلَح (سطر 53-57) |
| G3 | `collectionSummary` من `payment_invoices` | مُصلَح (سطر 69-93) |

---

## المشاكل المتبقية فعلياً (4 مشاكل)

### 1. `contractAllocation.ts` — `getPaymentCount` يُعيد 12 دائماً للعقد الشهري

**المشكلة:** عقد مدته 6 أشهر بنوع `monthly` يُولّد 12 دفعة بدلاً من 6.

**الإصلاح:** حساب عدد الدفعات بناءً على مدة العقد الفعلية:
- `monthly`: عدد الأشهر بين `start_date` و `end_date`
- `quarterly`: عدد الأشهر / 3
- `semi_annual`: عدد الأشهر / 6
- `annual`: عدد الأشهر / 12 (بحد أدنى 1)

### 2. `contractAllocation.ts` — `findFiscalYearForDate` تداخل الحدود

**المشكلة:** إذا كان `FY1.end_date = FY2.start_date`، التاريخ المشترك ينتمي لكلا السنتين (يُعيَّن لـ FY1 فقط بسبب الحلقة).

**الإصلاح:** تغيير الشرط إلى `date >= fyStart && date < fyEnd` (بداية شاملة، نهاية حصرية). استثناء: إذا كانت آخر سنة مالية، تبقى النهاية شاملة.

### 3. `ReportsPage` — الرسم البياني يستخدم `expensesByType` (يشمل VAT)

**المشكلة:** صفحة التقارير الإدارية تعرض VAT ضمن المصروفات في الرسم البياني، بينما تقرير المستفيد (`FinancialReportsPage`) يستثنيه. هذا يُسبب تناقضاً بصرياً.

**الإصلاح:** استخدام `expensesByTypeExcludingVat` في `ReportsPage` أيضاً مع عرض VAT كبند منفصل في البطاقات (كما هو حالياً)، لتتطابق الرسوم البيانية بين الصفحتين.

### 4. توثيق منطق حساب حصة المستفيد

بناءً على توضيح المستخدم، المنطق الصحيح:
```text
إجمالي الدخل
  - المصروفات
  - الضريبة (VAT)
  - الزكاة
  - حصة الناظر (10%)
  - حصة الواقف (5%)
  - رقبة الوقف
  = المبلغ المتاح للتوزيع (يوزع بالتناسب على المستفيدين)
```
لا توجد نسبة ثابتة للمستفيدين — الباقي بعد كل الخصومات يُوزّع تناسبياً حسب `share_percentage`. هذا المنطق مُطبَّق بالفعل في الكود (G2 fix) لكن يجب توثيقه في `accountsCalculations.ts`.

---

## التفاصيل التقنية

### الملف 1: `src/utils/contractAllocation.ts`

**`getPaymentCount`** (سطر 128-134):
```typescript
// قبل:
if (contract.payment_type === 'monthly') return 12;

// بعد:
if (contract.payment_type === 'monthly') {
  const months = monthsBetween(
    new Date(contract.start_date),
    new Date(contract.end_date)
  );
  return Math.max(1, months);
}
// نفس المنطق لـ quarterly, semi_annual, annual
```

اضافة دالة `monthsBetween` لحساب عدد الأشهر.

**`findFiscalYearForDate`** (سطر 117-126):
```typescript
// قبل:
if (date >= fyStart && date <= fyEnd) { return fy; }

// بعد: بداية شاملة، نهاية حصرية (إلا لآخر سنة)
const isLast = (i === sortedFYs.length - 1);
if (date >= fyStart && (isLast ? date <= fyEnd : date < fyEnd)) {
  return fy;
}
```

### الملف 2: `src/pages/dashboard/ReportsPage.tsx`

**سطر 40 و 49:**
```typescript
// قبل:
incomeBySource, expensesByType,
const expenseTypeData = Object.entries(expensesByType)...

// بعد:
incomeBySource, expensesByTypeExcludingVat,
const expenseTypeData = Object.entries(expensesByTypeExcludingVat)...
```

### الملف 3: `src/utils/accountsCalculations.ts`

اضافة توثيق واضح لمنطق التوزيع على المستفيدين:
```typescript
/**
 * توزيع حصص المستفيدين:
 * المبلغ المتاح = ريع الوقف - رقبة الوقف اليدوية
 * حصة كل مستفيد = المبلغ المتاح x (نسبته / مجموع النسب)
 * لا توجد نسبة ثابتة — الدخل قد يُستهلك بالكامل كمصروفات
 */
```

---

## ملخص التأثير

- **ملفات تُعدَّل:** 3 ملفات
- **خطورة:** المشكلتان في `contractAllocation.ts` حرجتان (تؤثران على توزيع الدفعات عبر السنوات)
- **المشكلة في `ReportsPage`** تناقض بصري بين التقريرين
- **لا حاجة لتغييرات في قاعدة البيانات**
