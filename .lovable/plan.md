

# مراجعة شاملة ومعمقة للنظام - جميع الملاحظات والمشاكل والاخطاء

---

## المرحلة 1: اخطاء محاسبية حرجة (تؤثر على صحة الارقام المالية)

### خطأ 1 - الحسابات الختامية: rent_amount يُعامل كشهري وهو سنوي
**الملف:** `AccountsPage.tsx` سطور 131-132، 159-161، 448-450

```text
// سطر 131 - يعتبر rent_amount شهري:
const totalRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);

// سطر 132 - يضرب السنوي x12 = قيمة مضخمة 12 ضعف:
const totalAnnualRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount) * 12, 0);

// سطر 448 - عمود "الإيجار الشهري" يعرض rent_amount كاملا:
{Number(contract.rent_amount).toLocaleString()} ريال  // يعرض 16,200 كشهري!

// سطر 450 - عمود "إجمالي العقد السنوي" يضرب x12:
{(Number(contract.rent_amount) * 12).toLocaleString()} ريال  // يعرض 194,400!
```

**النتيجة:** عقد بقيمة 16,200 سنوي يظهر كـ 16,200 شهري و 194,400 سنوي. خطأ كارثي.

**الاصلاح:**
- عمود "الشهري" = `payment_amount` او `rent_amount / 12` حسب `payment_type`
- عمود "السنوي" = `rent_amount` (هو اصلا السنوي)
- الاجمالي يجمع `rent_amount` بدون ضرب

### خطأ 2 - جدول التحصيل والمتأخرات: نفس الخطأ
**الملف:** `AccountsPage.tsx` سطور 156-173

```text
// سطر 159 - يعتبر rent_amount شهري:
const monthlyRent = Number(contract.rent_amount);  // 16,200 = شهري؟!

// سطر 160 - المحصّل = شهري x دفعات:
const totalCollected = monthlyRent * paidMonths;    // 16,200 x 12 = 194,400!

// سطر 161 - المتأخرات:
const arrears = (monthlyRent * 12) - totalCollected; // (194,400) - (194,400) = 0
```

**النتيجة:** ارقام التحصيل والمتأخرات مضخمة 12 ضعف. تقرير غير صالح للمراجعة.

**الاصلاح:**
- الشهري الحقيقي = `payment_amount` او `rent_amount / payment_count`
- المحصّل = الشهري الحقيقي x الدفعات المسددة
- المتأخرات = الشهري الحقيقي x (الدفعات المتوقعة - المسددة)

### خطأ 3 - تعديل الاجار يحفظ rent_amount كشهري
**الملف:** `AccountsPage.tsx` سطور 224-233

```text
await updateContract.mutateAsync({
  id: contract.id,
  tenant_name: editData.tenantName,
  rent_amount: editData.monthlyRent,  // يحفظ القيمة "الشهرية" في حقل السنوي!
});
```

**النتيجة:** عند تعديل عقد من جدول التحصيل، يتم حفظ القيمة المعدلة في `rent_amount` كأنها شهرية، مما يُفسد بيانات العقد بالكامل.

**الاصلاح:** يجب تعديل `payment_amount` وليس `rent_amount`، او التوضيح للمستخدم ان الحقل هو الايجار السنوي.

### خطأ 4 - صفحة التقارير: النسب ثابتة بالكود
**الملف:** `ReportsPage.tsx` سطور 36-38

```text
const adminShare = currentAccount ? Number(currentAccount.admin_share) : netRevenue * 0.10;
const waqifShare = currentAccount ? Number(currentAccount.waqif_share) : netRevenue * 0.05;
```

اذا لم يوجد حساب ختامي محفوظ، تُستخدم نسب 10% و 5% الثابتة بدلا من قراءتها من `app_settings`. هذا يتناقض مع `AccountsPage` التي تقرأ النسب من قاعدة البيانات.

### خطأ 5 - واجهة المستفيد: النسب ثابتة في العرض
**الملف:** `BeneficiaryDashboard.tsx` سطور 118-123

```text
<span>(-) حصة الناظر (10%)</span>
<span>(-) حصة الواقف (5%)</span>
```

النسب مكتوبة يدويا "10%" و "5%" في النص. اذا غيّر الناظر النسب في الاعدادات، واجهة المستفيد تعرض النسب القديمة. يجب قراءتها من `app_settings` او من الحساب الختامي.

---

## المرحلة 2: مشاكل في اتساق البيانات بين الصفحات

### مشكلة 6 - تقرير اداء العقارات: نشطة فقط
**الملف:** `ReportsPage.tsx` سطر 93-105

```text
const activeContracts = contracts.filter(c => c.property_id === property.id && c.status === 'active');
const annualRent = activeContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
```

صفحة العقارات تعرض "الايرادات التعاقدية" (نشطة + منتهية)، لكن صفحة التقارير تحسب النشطة فقط. تناقض بين الصفحتين.

### مشكلة 7 - صفحة العقود: الاحصائيات نشطة فقط
**الملف:** `ContractsPage.tsx` سطر 111

```text
const totalRent = active.reduce((sum, c) => sum + (Number(c.rent_amount) || 0), 0);
```

بطاقة "اجمالي الايجارات" تعرض النشطة فقط. حسب المبدأ المحاسبي المتفق عليه، يجب عرض مؤشرين: التعاقدي الشامل والنشط.

### مشكلة 8 - لوحة التحكم: لا تعرض الايرادات التعاقدية
**الملف:** `AdminDashboard.tsx` سطر 25

```text
const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
```

تعرض الدخل من جدول `income` فقط (المبالغ المسجلة فعليا)، بدون مؤشر للايرادات التعاقدية المتوقعة من العقود.

---

## المرحلة 3: مشاكل منطقية (Logic Bugs)

### مشكلة 9 - getTenant لا يرتب العقود زمنيا
**الملف:** `PropertiesPage.tsx` سطر 548

```text
const anyContract = contracts.find(c => c.unit_id === unitId);
```

`find` تعيد اول عقد تجده. اذا كان للوحدة عقدان منتهيان، قد تعرض الاقدم بدلا من الاحدث. يجب ترتيب العقود بـ `end_date` تنازليا.

### مشكلة 10 - wholePropertyContract يعرض عقد واحد فقط
**الملف:** `PropertiesPage.tsx` سطر 559

```text
const wholePropertyContract = contracts.find(c => c.property_id === property.id && !c.unit_id);
```

`find` تعيد اول عقد فقط. اذا كان للعقار عقدان "كامل" (نشط ومنتهي)، يعرض واحد فقط والاخر يختفي.

### مشكلة 11 - صف الاجمالي لا يشمل عقود "العقار كامل"
**الملف:** `PropertiesPage.tsx` سطور 872-900

صف الاجمالي يجمع فقط العقود المربوطة بوحدات عبر `getTenant(unit.id)`. العقود المربوطة بالعقار كامل (بدون `unit_id`) لا تدخل في الاجمالي.

### مشكلة 12 - الدفعات المتوقعة ثابتة على 12
**الملف:** `AccountsPage.tsx` سطر 166

```text
expectedPayments: 12,
```

العقد الذي نوع دفعه "سنوي" دفعته المتوقعة 1، والمتعدد حسب `payment_count`. الرقم 12 صحيح فقط للشهري.

---

## المرحلة 4: مشاكل تجربة المستخدم (UX)

### مشكلة 13 - حوارات بدون DialogDescription
جميع حوارات Dialog في الصفحات التالية تفتقد لـ `DialogDescription`:
- `PropertiesPage.tsx`
- `ContractsPage.tsx`
- `ExpensesPage.tsx`
- `AccountsPage.tsx`

هذا يسبب تحذيرات مستمرة في المتصفح ويؤثر على accessibility.

### مشكلة 14 - تعديل وحدة بعقد منتهي لا يحمل بيانات المستأجر
عند تعديل وحدة لها عقد منتهي فقط (بدون نشط)، لا يتم تحميل بيانات الايجار السابقة في نموذج التعديل.

### مشكلة 15 - عدم التحقق من مجموع نسب المستفيدين
**الملف:** `AccountsPage.tsx` سطر 180

لا يوجد تحقق ان مجموع نسب المستفيدين لا يتجاوز 100%. اذا تجاوز، تنتج مبالغ توزيع اكبر من المتاح.

---

## ملخص الاولويات

| # | الاولوية | الملف | المشكلة | التأثير |
|---|----------|-------|---------|---------|
| 1 | حرج | AccountsPage | rent_amount x 12 خاطئ | ارقام مالية مضخمة 12 ضعف |
| 2 | حرج | AccountsPage | التحصيل يعتبر rent_amount شهري | متأخرات وتحصيل خاطئة |
| 3 | حرج | AccountsPage | تعديل يحفظ شهري في حقل سنوي | افساد بيانات العقود |
| 4 | عالي | ReportsPage | نسب ثابتة 10%/5% | تناقض مع الاعدادات |
| 5 | عالي | BeneficiaryDashboard | نسب ثابتة في النص | عرض خاطئ للمستفيدين |
| 6 | عالي | ReportsPage | اداء العقارات نشطة فقط | تناقض مع بطاقات العقارات |
| 7 | متوسط | ContractsPage | احصائيات نشطة فقط | عدم شمولية |
| 8 | متوسط | AdminDashboard | لا يوجد مؤشر تعاقدي | نقص في المعلومات |
| 9 | متوسط | PropertiesPage | getTenant بدون ترتيب زمني | عرض عقد قديم |
| 10 | متوسط | PropertiesPage | wholePropertyContract واحد فقط | فقدان عقود |
| 11 | متوسط | PropertiesPage | اجمالي بدون عقود العقار كامل | ارقام ناقصة |
| 12 | متوسط | AccountsPage | دفعات متوقعة = 12 دائما | خطأ للسنوي والمتعدد |
| 13 | منخفض | عدة ملفات | DialogDescription مفقود | تحذيرات المتصفح |
| 14 | منخفض | PropertiesPage | تعديل وحدة منتهية | تجربة مستخدم |
| 15 | منخفض | AccountsPage | نسب المستفيدين بدون تحقق | خطر تجاوز 100% |

---

## خطة الاصلاح المقترحة

### المرحلة 1 - الاخطاء الحرجة (AccountsPage.tsx)
1. تصحيح جدول العقود: الشهري = `payment_amount` او `rent_amount/payment_count`، السنوي = `rent_amount`
2. تصحيح جدول التحصيل: استخدام الشهري الحقيقي واعتماد `payment_count` كدفعات متوقعة
3. تصحيح التعديل المباشر: عدم الكتابة فوق `rent_amount`
4. تصحيح اجماليات الجداول

### المرحلة 2 - توحيد البيانات
5. `ReportsPage.tsx`: قراءة النسب من `app_settings` واضافة الايرادات التعاقدية
6. `BeneficiaryDashboard.tsx`: قراءة النسب من الحساب الختامي ديناميكيا
7. `ContractsPage.tsx`: اضافة مؤشر الايرادات التعاقدية الشاملة
8. `AdminDashboard.tsx`: اضافة بطاقة الايرادات التعاقدية

### المرحلة 3 - اصلاحات منطقية وتحسينات
9. ترتيب العقود في `getTenant` زمنيا
10. تحويل `wholePropertyContract` الى `filter` بدلا من `find`
11. تضمين عقود العقار كامل في صف الاجمالي
12. استخدام `payment_count` كدفعات متوقعة
13. اضافة `DialogDescription` لجميع الحوارات
14. اضافة تحقق من مجموع نسب المستفيدين

