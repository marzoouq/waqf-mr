# إصلاح تناقض حساب الإشغال وتحسين صفحة العقارات

## المشاكل المكتشفة

### 1. تناقض في الارقام

البطاقات الاجمالية في الاعلى تحسب الاشغال من العقود المفلترة بالسنة المالية، لكن بطاقات العقارات الفردية تستخدم `unit.status` الثابت مباشرة. ينتج عن هذا ارقام مختلفة بين المستويين.

### 2. شارات حالة الوحدة

شارة الحالة في قسم الوحدات الموسع تعرض `unit.status` الثابت بدلا من الحالة المحسوبة من العقود.

## التعديلات المطلوبة

### ملف: `src/pages/beneficiary/PropertiesViewPage.tsx`

**التعديل الرئيسي:** توحيد حساب الاشغال في بطاقات العقارات الفردية ليعتمد على العقود المفلترة بدلا من `unit.status`:

```text
بدلا من:
  const rented = propertyUnits.filter(u => u.status === 'مؤجرة').length;
  const vacant = propertyUnits.filter(u => u.status === 'شاغرة').length;

يصبح:
  const propertyContracts = contracts.filter(c => c.property_id === property.id);
  const rentedUnitIdsForProp = new Set(propertyContracts.filter(c => c.unit_id).map(c => c.unit_id));
  const isWholePropertyRented = propertyContracts.some(c => !c.unit_id);
  
  const rented = isWholePropertyRented ? total : propertyUnits.filter(u => rentedUnitIdsForProp.has(u.id)).length;
  const vacant = total - rented;
```

**تعديل شارة الوحدة:** في قسم التوسيع، حساب حالة الوحدة من العقود:

```text
بدلا من:
  unit.status === 'مؤجرة'

يصبح:
  rentedUnitIdsForProp.has(unit.id) || isWholePropertyRented ? 'مؤجرة' : unit.status
```


| الملف                                          | التعديل                                            |
| ---------------------------------------------- | -------------------------------------------------- |
| `src/pages/beneficiary/PropertiesViewPage.tsx` | توحيد حساب الاشغال من العقود + تحديث شارات الوحدات |


## ملاحظات

- لا تعديل على قاعدة البيانات
- العقارات والوحدات تبقى مرئية كاصول ثابتة (لا تملك fiscal_year_id)
- المؤشرات المالية (ايرادات، مصروفات، صافي) مقيدة فعلا بالعقود والمصروفات المفلترة
- الناظر يرى كل شيء عند دخوله واجهة المستفيد وهذا مقصود لغرض المعاينة
- البطاقات يجب إظهار الموجر الفعلي بالعقود 
- تظهر السنه الفعليه بالبطاقات فقط 