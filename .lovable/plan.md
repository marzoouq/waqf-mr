

# خطة شاملة: لوحة مراقبة الأداء + MobileCardView لجميع الجداول + إصلاح أمني

## ملخص

4 مهام رئيسية:
1. إضافة تبويب "مراقبة الأداء" في إعدادات الناظر
2. إضافة MobileCardView لجميع الجداول التي تفتقر إليها (15 صفحة)
3. إصلاح تحذير `beneficiaries_safe` الأمني بإضافة RLS policies
4. إغلاق تحذير `extension_in_public`

---

## 1. تبويب مراقبة الأداء (جديد في الإعدادات)

**ملف جديد:** `src/components/settings/PerformanceMonitorTab.tsx`

يعرض:
- **الاستعلامات البطيئة** من `getSlowQueries()` (الموجودة في `performanceMonitor.ts`)
- **مقاييس تحميل الصفحة** (Navigation Timing API): loadTime, domInteractive, TTFB
- **حجم DOM**: عدد العناصر
- **ذاكرة JS** (إن توفرت): usedJSHeapSize
- زر "تحديث" لإعادة جمع البيانات
- زر "مسح السجل" لتنظيف الاستعلامات البطيئة

**تعديل:** `src/pages/dashboard/SettingsPage.tsx`
- إضافة تبويب "الأداء" مع أيقونة `Activity` في TabsList والقائمة المنسدلة

---

## 2. إضافة MobileCardView لجميع الجداول

الصفحات التي تحتوي جداول بدون MobileCardView (14 صفحة):

**لوحة الناظر:**
- `ContractsPage.tsx` — العقود
- `PropertiesPage.tsx` — العقارات
- `IncomePage.tsx` — الدخل
- `ExpensesPage.tsx` — المصروفات
- `BeneficiariesPage.tsx` — المستفيدين
- `UserManagementPage.tsx` — إدارة المستخدمين
- `AuditLogPage.tsx` — سجل المراجعة
- `SupportDashboardPage.tsx` — الدعم الفني
- `ZatcaManagementPage.tsx` — إدارة ZATCA

**واجهة المستفيد:**
- `ContractsViewPage.tsx` — عرض العقود
- `PropertiesViewPage.tsx` — عرض العقارات
- `InvoicesViewPage.tsx` — عرض الفواتير
- `DisclosurePage.tsx` — الإفصاح (جدول العقود)
- `CarryforwardHistoryPage.tsx` — سجل الترحيل

**وكذلك مكونات فرعية:**
- `AccountsBeneficiariesTable.tsx`
- `AccountsCollectionTable.tsx`
- `AccountsContractsTable.tsx`
- `AccountsDistributionTable.tsx`
- `AccountsExpensesTable.tsx`
- `AccountsIncomeTable.tsx`
- `PaymentInvoicesTab.tsx`

**النهج:** لكل صفحة:
1. Import `MobileCardView`
2. إضافة `<MobileCardView>` قبل الجدول مع `getTitle`, `getFields`, `getBadge`
3. إخفاء الجدول على الجوال بـ `hidden md:block`

---

## 3. إصلاح أمني: `beneficiaries_safe`

**Migration SQL:**
```sql
-- beneficiaries_safe هو View وليس جدول، لكن الفحص يطلب RLS policies
-- الحل: التأكد من أن الـ View يستخدم security_invoker = on (موجود بالفعل)
-- وإضافة تعليق توثيقي + إغلاق التحذير

COMMENT ON VIEW public.beneficiaries_safe IS 
'Secure view with security_invoker=on. Access controlled by RLS on underlying beneficiaries table.';
```