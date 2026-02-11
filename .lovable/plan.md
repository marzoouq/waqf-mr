

# تعزيز الشفافية الشاملة في صفحة العقارات

## التحليل الحالي - ما ينقص النظام

بعد فحص شامل للتطبيق، بطاقة كل عقار حالياً تعرض فقط: النوع، الموقع، المساحة، والوصف. لا توجد أي مؤشرات مالية أو تشغيلية. هذا يعني أن الناظر والمستفيدين لا يستطيعون تقييم أداء كل عقار بنظرة واحدة.

---

## المؤشرات المقترحة (8 مؤشرات مقسمة لقسمين)

### القسم الأول: المؤشرات التشغيلية (4 مؤشرات)
1. **عدد الوحدات المؤجرة** - من جدول units حيث status = 'مؤجرة'
2. **عدد الوحدات الشاغرة** - من جدول units حيث status = 'شاغرة'
3. **عدد الوحدات تحت الصيانة** - من جدول units حيث status = 'صيانة'
4. **نسبة الإشغال** - شريط تقدم بصري (مؤجرة / إجمالي الوحدات x 100%) مع تلوين:
   - اخضر > 80%
   - اصفر 50-80%
   - احمر < 50%

### القسم الثاني: المؤشرات المالية (4 مؤشرات)
5. **الإيجار الشهري** - مجموع rent_amount / 12 من العقود النشطة للعقار
6. **الإيجار السنوي** - مجموع rent_amount من العقود النشطة للعقار
7. **إجمالي المصروفات** - مجموع المصروفات المرتبطة بالعقار من جدول expenses
8. **صافي الدخل** - (الإيجار السنوي - المصروفات) مع تلوين اخضر/احمر

---

## شكل بطاقة العقار المحسنة

```text
+-------------------------------------+
|  عقار W-001              [تعديل][حذف]|
|  مبنى سكني | الطائف | 500 م²        |
|-------------------------------------|
|  مؤجرة: 6   شاغرة: 1   صيانة: 1    |
|  ████████████░░░  الإشغال: 75%      |
|-------------------------------------|
|  الإيجار الشهري:    8,333 ريال      |
|  الإيجار السنوي:  100,000 ريال      |
|  المصروفات:        15,000 ريال      |
|  صافي الدخل:       85,000 ريال      |
|-------------------------------------|
|  اضغط لعرض الوحدات السكنية          |
+-------------------------------------+
```

---

## التنفيذ التقني

### الملفات المعدلة (2 ملف)

#### 1. `src/hooks/useUnits.ts` - إضافة useAllUnits
إضافة hook جديد يجلب جميع الوحدات بدون فلتر property_id لاستخدامه في حساب إحصائيات كل عقار في بطاقته:

```text
export const useAllUnits = () => {
  return useQuery({
    queryKey: ['all-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*');
      if (error) throw error;
      return data as UnitRow[];
    },
  });
};
```

#### 2. `src/pages/dashboard/PropertiesPage.tsx` - تحديث بطاقات العقارات
- استيراد `useAllUnits` و `useExpenses` و `Progress`
- حساب المؤشرات لكل عقار داخل البطاقة:

```text
// لكل عقار:
const propertyUnits = allUnits.filter(u => u.property_id === property.id);
const rented = propertyUnits.filter(u => u.status === 'مؤجرة').length;
const vacant = propertyUnits.filter(u => u.status === 'شاغرة').length;
const maintenance = propertyUnits.filter(u => u.status === 'صيانة').length;
const occupancy = propertyUnits.length > 0 ? (rented / propertyUnits.length) * 100 : 0;

const activeContracts = contracts.filter(c => c.property_id === property.id && c.status === 'active');
const annualRent = activeContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
const monthlyRent = annualRent / 12;

const propExpenses = expenses.filter(e => e.property_id === property.id);
const totalExpenses = propExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
const netIncome = annualRent - totalExpenses;
```

- تحويل البطاقة من عرض بسيط إلى لوحة مؤشرات مصغرة
- استخدام مكون `Progress` لشريط الإشغال البصري
- تلوين صافي الدخل (اخضر إذا موجب، احمر إذا سالب)
- تلوين شريط الإشغال حسب النسبة
- جميع المبالغ بتنسيق `toLocaleString('ar-SA')` + "ريال"

### ملاحظة: البيانات تُقرأ مباشرة
جميع المؤشرات تُحسب ديناميكياً من البيانات الفعلية في قاعدة البيانات (units, contracts, expenses) بدون أي قيم ثابتة، مما يضمن شفافية تامة وتطابق مع الواقع المالي.

