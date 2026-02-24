

# اصلاح ارقام مقارنة أداء العقارات في صفحة التقارير

## المشكلة

تقرير "مقارنة أداء العقارات" في صفحة التقارير يحتوي على مشكلتين رئيسيتين تؤدي لأرقام خاطئة:

### المشكلة الأولى: حساب الإشغال خاطئ
التقرير يستخدم حقل `status` الثابت على جدول الوحدات (`u.status === 'مؤجرة'`) بدلاً من العقود النشطة كما في صفحة العقارات.

| العقار | التقرير (خاطئ) | صفحة العقارات (صحيح) | السبب |
|--------|---------------|---------------------|-------|
| 001 | 83% (5/6 بالحالة) | 100% (عقد كامل) | التقرير يتجاهل العقد الكامل |
| 101 | 50% (4/8) | 50% (4/8) | متطابق بالصدفة |
| 102 | 67% (6/9 بالحالة) | 56% (5/9 بالعقود) | 6 وحدات "مؤجرة" بالحالة لكن فقط 5 عقود نشطة |

### المشكلة الثانية: العقود غير مفلترة بالسنة المالية
- **العقود**: تستخدم `useContracts()` الذي يجلب كل العقود من كل السنوات
- **المصروفات**: تأتي من `useFinancialSummary` وهي مفلترة بالسنة المالية
- **النتيجة**: الإيرادات التعاقدية تشمل كل السنوات بينما المصروفات لسنة واحدة فقط = صافي دخل مضلل

## الحل

### 1. استبدال `useContracts()` بـ `useContractsByFiscalYear()`
استخدام نفس hook الفلترة المستخدم في صفحة العقارات لضمان تطابق البيانات.

### 2. توحيد منطق الإشغال مع صفحة العقارات
نقل حساب الإشغال ليعتمد على العقود النشطة بدلاً من حالة الوحدة الثابتة، مع مراعاة:
- العقود الكاملة (بدون unit_id)
- أولوية عقود الوحدات عند وجود وحدات مسجلة
- نفس المنطق المُصحح سابقاً في PropertiesPage

## التفاصيل التقنية

### الملف: `src/pages/dashboard/ReportsPage.tsx`

**التغيير 1** - استبدال import (سطر 6):
```typescript
// قبل
import { useContracts } from '@/hooks/useContracts';
// بعد
import { useContractsByFiscalYear } from '@/hooks/useContracts';
```

**التغيير 2** - استبدال hook (سطر 26):
```typescript
// قبل
const { data: contracts = [] } = useContracts();
// بعد
const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
```

**التغيير 3** - اصلاح منطق الإشغال (سطور 85-101):
```typescript
const propertyPerformance = properties.map((property) => {
    const propertyUnits = allUnits.filter(u => u.property_id === property.id);
    const totalUnitsCount = propertyUnits.length;
    const isSpecificYear = fiscalYearId !== 'all';
    
    const propContracts = contracts.filter(c => c.property_id === property.id);
    const rentedUnitIds = new Set(
      propContracts
        .filter(c => (isSpecificYear || c.status === 'active') && c.unit_id)
        .map(c => c.unit_id)
    );
    const hasWholePropertyContract = propContracts.some(
      c => (isSpecificYear || c.status === 'active') && !c.unit_id
    );
    
    const isWholePropertyRented = totalUnitsCount === 0 && hasWholePropertyContract;
    const unitBasedRented = propertyUnits.filter(u => rentedUnitIds.has(u.id)).length;
    const rented = (totalUnitsCount > 0 && hasWholePropertyContract && unitBasedRented === 0)
      ? totalUnitsCount
      : (isWholePropertyRented ? totalUnitsCount : unitBasedRented);

    let occupancy: number;
    if (totalUnitsCount > 0) {
      occupancy = Math.round((rented / totalUnitsCount) * 100);
    } else if (isWholePropertyRented) {
      occupancy = 100;
    } else {
      occupancy = 0;
    }
    // ... باقي الحسابات تبقى كما هي
});
```

هذا يضمن تطابق ارقام الإشغال والإيرادات بين صفحة التقارير وصفحة العقارات.

