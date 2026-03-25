

# فحص جنائي لخطة إصلاح لوحة الناظر — التحقق والتنفيذ

## نتائج الفحص الجنائي لكل بند

### 1. تناقض استيراد `useAuth` — **منخفض الخطورة**
- **الواقع**: `AuthContext.tsx` يُعيد تصدير `useAuth` من `@/hooks/auth/useAuthContext` (سطر 23)، فكلا المسارين يعملان بشكل صحيح
- **36 ملف** يستورد من `@/contexts/AuthContext` مقابل **6 ملفات** من `@/hooks/auth/useAuthContext`
- **القرار**: توحيد مفيد لتحسين HMR لكنه ليس خطأ وظيفياً

### 2. `relevantContracts` بدون `useMemo` — **مؤكد** (سطر 111)
```
const relevantContracts = isSpecificYear ? contracts : contracts.filter(c => c.status === 'active');
```
يُعاد حسابه في كل render. `contractualRevenue` (سطر 113) يعتمد عليه بـ `useMemo` مما يضعف فائدة ذلك الـ memo.

### 3. `zakatAmount` في dependency array — **مؤكد** (سطر 172)
موجود في dependencies لـ `stats` useMemo لكنه غير مستخدم داخل الدالة. تنظيف بسيط.

### 4. عناوين بطاقات مكررة — **مؤكد** (أسطر 164-166)
```
title: isYearActive ? 'حصة الناظر' : 'حصة الناظر'  // نفس القيمة!
```
3 بطاقات بنفس المشكلة.

### 5. `RecentContractsCard` — حالة `cancelled` مفقودة — **مؤكد**
السطران 63-68 و 95-100: فقط `active` → أخضر، وأي شيء آخر → أحمر "منتهي". عقد ملغي يظهر كـ "منتهي" وهذا غير دقيق.

### 6. `CollectionHeatmap` — فلترة بالسنة فقط — **مؤكد جزئياً**
السطر 81-83: يقارن `year` بـ `startYear/endYear`. لسنة مالية 2025-07 → 2026-06، فاتورة يناير 2025 (خارج النطاق) ستُدرج خطأً لأن 2025 بين startYear و endYear. الإصلاح: مقارنة التاريخ الكامل.

### 7. سطر فارغ زائد — **مؤكد** (سطر 66)

---

## خطة التنفيذ

### الملف 1: `src/pages/dashboard/AdminDashboard.tsx`
- لف `relevantContracts` بـ `useMemo` مع dependencies: `[contracts, isSpecificYear]`
- إزالة `zakatAmount` من dependency array سطر 172
- تبسيط العناوين المكررة (3 أسطر: 164, 165, 166)
- حذف السطر الفارغ الزائد (سطر 66)

### الملف 2: `src/components/dashboard/RecentContractsCard.tsx`
- إضافة حالة `cancelled` بلون برتقالي/تحذيري ونص "ملغي"
- تحويل الشرط الثنائي إلى دالة تعيد اللون والنص حسب الحالة

### الملف 3: `src/components/dashboard/CollectionHeatmap.tsx`
- تغيير `yearRange` ليحفظ التواريخ الكاملة (`startDate`, `endDate`) بدل السنوات فقط
- الفلترة بمقارنة `dateObj >= startDate && dateObj <= endDate`

### الملف 4: توحيد استيراد `useAuth` (اختياري — 36 ملف)
- نظراً لأن كلا المسارين يعملان، يمكن تأجيل هذا أو تنفيذه تدريجياً
- الأولوية للملفات الأساسية: `AdminDashboard`, `MessagesPage`, `AccountsPage`, `SupportDashboardPage`

---

## تقييم المخاطر

| البند | خطورة | تأثير | جهد |
|-------|--------|-------|-----|
| `useMemo` لـ relevantContracts | منخفض | أداء | دقيقة |
| إزالة zakatAmount | لا يوجد | تنظيف | ثوانٍ |
| عناوين مكررة | لا يوجد | تنظيف | ثوانٍ |
| حالة cancelled | متوسط | دقة بصرية | 5 دقائق |
| فلترة Heatmap | متوسط | دقة بيانات | 10 دقائق |
| توحيد imports | لا يوجد | صيانة | 15 دقيقة |

**لا توجد مخاطر أمنية أو فقدان بيانات في أي من الإصلاحات.**

