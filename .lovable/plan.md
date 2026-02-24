

# إصلاح بطاقات العقارات للسنوات المغلقة

## المشكلة

التعديل السابق فلتر العقود بـ `status === 'active'` فقط، مما يجعل السنوات المغلقة تظهر **صفر وحدات مؤجرة** لأن كل عقودها بحالة `expired`. السنة المغلقة يجب أن تعرض جميع عقودها (بما فيها المنتهية) لأنها تمثل الحالة الفعلية عند الإقفال.

## القاعدة المطلوبة

| نوع السنة | المنطق |
|-----------|--------|
| سنة نشطة | عرض العقود **النشطة فقط** (`active`) |
| سنة مغلقة | عرض **جميع العقود** (تمثل الحالة التاريخية) |
| جميع السنوات | عرض العقود **النشطة فقط** |

## الحل

### التغييرات في `src/pages/dashboard/PropertiesPage.tsx`

1. استخدام `isClosed` من `useFiscalYear()` لتحديد ما إذا كانت السنة مغلقة
2. تعديل فلتر العقود في 4 أماكن ليكون:
   - إذا كانت السنة مغلقة: لا يُصفّى بالحالة (كل العقود تُحسب)
   - إذا كانت السنة نشطة أو "جميع السنوات": يُصفّى بـ `active` فقط

```text
// المنطق الجديد:
const isContractCounted = (c) => isClosed || c.status === 'active';

// بدلاً من:
contracts.filter(c => c.status === 'active' && c.unit_id)
// يصبح:
contracts.filter(c => isContractCounted(c) && c.unit_id)
```

### التغييرات في `src/pages/beneficiary/PropertiesViewPage.tsx`

نفس المنطق باستخدام `isClosed` من `useFiscalYear()`.

## التفاصيل التقنية

### `src/pages/dashboard/PropertiesPage.tsx`:

1. إضافة `isClosed` من `useFiscalYear()` (سطر 37)
2. تعديل سطر 69: `contracts.filter(c => (isClosed || c.status === 'active') && c.unit_id)`
3. تعديل سطر 70: `contracts.filter(c => (isClosed || c.status === 'active') && !c.unit_id)`
4. تعديل سطر 318: نفس المنطق لبطاقات العقارات الفردية
5. تعديل سطر 319: نفس المنطق

### `src/pages/beneficiary/PropertiesViewPage.tsx`:

1. إضافة `isClosed` من `useFiscalYear()` 
2. تعديل سطر 59-60: `contracts.filter(c => (isClosed || c.status === 'active') && c.unit_id)`
3. تعديل سطر 62-63: `contracts.filter(c => (isClosed || c.status === 'active') && !c.unit_id)`

### الملفات المتأثرة:
- `src/pages/dashboard/PropertiesPage.tsx` (5 تعديلات)
- `src/pages/beneficiary/PropertiesViewPage.tsx` (3 تعديلات)

### لا حاجة لتعديل:
- قاعدة البيانات
- ملفات أخرى

