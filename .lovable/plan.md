

# إضافة مربعات إحصائية أعلى صفحة إدارة العقود

## الإضافات على ملف واحد: `src/pages/dashboard/ContractsPage.tsx`

### المربعات الخمسة

| المربع | القيمة | اللون |
|--------|--------|-------|
| إجمالي العقود | عدد كل العقود | أزرق |
| العقود النشطة | عدد + نسبة مئوية | أخضر |
| العقود المنتهية | عدد العقود المنتهية | أحمر |
| إجمالي الإيجارات السنوية | مجموع rent_amount للنشطة | بنفسجي |
| عقود قريبة الانتهاء | عقود تنتهي خلال 90 يوم | برتقالي |

### التفاصيل الفنية

**الحسابات** من بيانات `contracts` الموجودة بدون أي استعلامات إضافية:

```text
activeContracts = contracts.filter(c => c.status === 'active')
expiredContracts = contracts.filter(c => c.status === 'expired')
totalActiveRent = activeContracts.reduce(sum of rent_amount)
expiringSoon = activeContracts التي end_date خلال 90 يوم من اليوم
```

**الموقع**: بين عنوان الصفحة (سطر 113) وشريط البحث (سطر 194)

**التصميم**: شبكة متجاوبة `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` مع أيقونات من lucide-react (FileText, CheckCircle, XCircle, DollarSign, AlertTriangle)

