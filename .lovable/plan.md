

# اصلاح عدم تطابق عدد الشقق الشاغرة

## المشكلة المكتشفة

هناك **3 مشاكل متداخلة** تسبب عدم تطابق عدد الشقق الشاغرة:

### 1. عدم تصفية العقود حسب الحالة (الخطأ الرئيسي)
البطاقات الإجمالية تحسب **جميع العقود** في السنة المالية بما فيها العقود المنتهية والملغاة. يجب أن تحسب فقط العقود **النشطة** (`status = 'active'`).

**مثال**: إذا كان هناك عقد منتهي على وحدة، تظهر الوحدة كـ "مؤجرة" بينما هي فعلياً شاغرة.

### 2. عدم احتساب وحدات الصيانة بشكل صحيح في الملخص
بطاقة الملخص الإجمالية تحسب وحدات الصيانة ضمن "الشاغرة"، بينما بطاقات العقارات الفردية تعرض الصيانة بشكل منفصل. هذا يسبب تناقضاً بصرياً.

### 3. تناقض بين واجهة الناظر وواجهة المستفيد
واجهة المستفيد (`PropertiesViewPage`) تستخدم منطقاً مختلفاً قليلاً عن واجهة الناظر (`PropertiesPage`).

---

## الحل المقترح

### الملف الأول: `src/pages/dashboard/PropertiesPage.tsx`

**تعديل حساب الملخص (سطر 69-86)**:
- تصفية العقود لتشمل فقط `status === 'active'` عند بناء مجموعات `rentedUnitIds` و `wholePropertyIds`
- نفس التصفية في بطاقات العقارات الفردية (سطر 317-318)

```text
قبل:
  contracts.filter(c => c.unit_id)        // كل العقود
  contracts.filter(c => !c.unit_id)       // كل العقود

بعد:
  contracts.filter(c => c.status === 'active' && c.unit_id)    // النشطة فقط
  contracts.filter(c => c.status === 'active' && !c.unit_id)   // النشطة فقط
```

### الملف الثاني: `src/pages/beneficiary/PropertiesViewPage.tsx`

**نفس التصفية (سطر 59-63)**:
- اضافة `c.status === 'active'` لضمان تطابق المنطق مع واجهة الناظر

---

## التفاصيل التقنية

### التغييرات في `PropertiesPage.tsx`:

1. **سطر 69**: تغيير من
   `contracts.filter(c => c.unit_id)` الى
   `contracts.filter(c => c.status === 'active' && c.unit_id)`

2. **سطر 70**: تغيير من
   `contracts.filter(c => !c.unit_id)` الى
   `contracts.filter(c => c.status === 'active' && !c.unit_id)`

3. **سطر 318**: تغيير من
   `contracts.filter(c => c.property_id === property.id)` -- ثم فلترة unit_id
   الى تضمين `c.status === 'active'` في الفلتر

4. **سطر 319**: نفس التعديل للعقود الكاملة

### التغييرات في `PropertiesViewPage.tsx`:

1. **سطر 59-60**: اضافة `c.status === 'active'` لفلتر `rentedUnitIds`
2. **سطر 62-63**: اضافة `c.status === 'active'` لفلتر `wholePropertyIds`

### الملفات المتأثرة:
- `src/pages/dashboard/PropertiesPage.tsx` (4 تعديلات)
- `src/pages/beneficiary/PropertiesViewPage.tsx` (2 تعديلات)

### لا حاجة لتعديل:
- قاعدة البيانات
- الاختبارات (المنطق يصبح اصح)
- اي ملفات اخرى

