

# خطة إصلاح — لوحة التحكم وصفحة العقود (6 إصلاحات مؤكدة)

## نتيجة التحقق

بعد فحص الكود سطراً بسطر:

| # | الوصف | الحكم |
|---|-------|-------|
| 1 | نص حوار التجديد الجماعي "من اليوم لمدة سنة" بينما الكود يبدأ من `oldEnd` | مؤكد - تضليل في الواجهة |
| 2 | بطاقتا حصة الناظر والواقف تعرضان "0 ر.س (بعد الإقفال)" في السنة النشطة | مؤكد - UX مربك |
| 3 | `collectionSummary` في AdminDashboard لا يراعي `end_date` العقد | مؤكد - نفس BUG-17 المُصلح في WaqifDashboard |
| 4 | `collectionRate` في KPI قد يتجاوز 100% | مؤكد - نفس BUG-16 |
| 5 | `.env` غير موجود في `.gitignore` | غير مشكلة: ملف مُدار تلقائياً من Lovable Cloud يحتوي مفاتيح عامة فقط |
| 6 | `net_after_zakat` غير محفوظ في قاعدة البيانات | تصميم مقصود: يُحسب ديناميكياً من `net_after_vat - zakat_amount` |
| 7 | `payment_type` تعارض بين الصفحات | مؤكد - `ContractsPage` لا يدعم `quarterly`/`semi_annual` |
| 8 | BUG-08 (`waqfRevenue = netAfterZakat`) | تم إصلاحه بالفعل (سطر 94: `waqfRevenue: 0`) |

---

## الإصلاحات المطلوبة

### 1. تصحيح نص حوار التجديد الجماعي
**الملف:** `src/pages/dashboard/ContractsPage.tsx` سطر 518

تغيير النص من:
`"سيتم إنشاء عقود جديدة بنفس البيانات مع تواريخ جديدة (من اليوم لمدة سنة)"`
الى:
`"سيتم إنشاء عقود جديدة بنفس البيانات مع تواريخ تبدأ من تاريخ انتهاء العقد السابق وبنفس المدة"`

### 2. تحسين عرض بطاقات الحصص في السنة النشطة
**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطور 101-103

عند `isYearActive = true`:
- تغيير القيمة المعروضة من `"0 ر.س"` الى `"تُحسب عند الإقفال"`
- ابقاء البطاقات ظاهرة لكن بأسلوب مختلف (نص توضيحي بدل رقم صفر)

### 3. اضافة clamp بـ `end_date` لحساب `expectedPayments` في AdminDashboard
**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطور 60-74

نفس الاصلاح المُطبَّق على `WaqifDashboard`:
- استخدام `Math.min(now, endDate)` بدلاً من `now` في حساب `differenceInMonths`
- هذا يمنع اعتبار العقود القديمة "متأخرة" بعد انتهائها

### 4. تقييد `collectionRate` في KPI عند 100%
**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 168

تغيير:
`Math.round((totalIncome / contractualRevenue) * 100)`
الى:
`Math.min(100, Math.round((totalIncome / contractualRevenue) * 100))`

### 5. توحيد منطق `paymentCount` بين الصفحات
**الملف:** `src/pages/dashboard/ContractsPage.tsx` سطور 56, 121, 220

اضافة دعم `quarterly` و `semi_annual` في حساب `paymentCount`:
```text
monthly = 12
quarterly = 4
semi_annual = 2
annual = 1
multi = payment_count
```

هذا يُطبَّق في 3 مواضع:
- `handlePayment` (سطر 56)
- `handleFormSubmit` (سطر 121)
- `handleBulkRenew` (سطر 220)

### 6. توحيد `getPaymentTypeLabel` ليشمل الأنواع الجديدة
**الملف:** `src/pages/dashboard/ContractsPage.tsx` سطر 256

اضافة:
- `quarterly` = "ربعي"
- `semi_annual` = "نصف سنوي"

---

## ملخص الملفات المتأثرة

| الملف | عدد التعديلات |
|-------|--------------|
| `src/pages/dashboard/AdminDashboard.tsx` | 3 |
| `src/pages/dashboard/ContractsPage.tsx` | 4 |

**الإجمالي:** 2 ملف، 7 تعديل

