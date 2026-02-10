
# فحص الهوية البصرية الشامل - تقرير وخطة الاصلاح

## نتائج الفحص

### 1. مشاكل الخطوط وحجمها

**مشكلة: عدم استخدام خط Amiri للعناوين بشكل متسق**
- العناوين في الصفحات الداخلية (لوحة التحكم، العقارات، العقود، الخ) تستخدم `text-3xl font-bold` بدون `font-display` (خط Amiri)
- يجب ان تكون جميع العناوين الرئيسية (h1) بخط Amiri عبر كلاس `font-display`
- الصفحات المتأثرة: AdminDashboard, PropertiesPage, ContractsPage, IncomePage, ExpensesPage, BeneficiariesPage, ReportsPage, AccountsPage, UserManagementPage, BeneficiaryDashboard, DisclosurePage, MySharePage, FinancialReportsPage

**مشكلة: احجام الخطوط على الجوال**
- العناوين `text-3xl` (30px) كبيرة جدا على شاشات الجوال الصغيرة
- يجب استخدام `text-2xl md:text-3xl` للتدرج المتجاوب

### 2. مشاكل الجداول

**مشكلة: الجداول تستخدم HTML خام بدون مكون Table الموحد**
- جميع الجداول في التطبيق تستخدم `<table>` HTML مباشرة بدلا من مكون `src/components/ui/table.tsx` الموجود
- هذا يسبب عدم اتساق في التصميم والتنسيق بين الجداول
- الجداول المتأثرة: AdminDashboard (اخر العقود)، ContractsPage، IncomePage، ExpensesPage، ReportsPage (3 جداول)، AccountsPage، UserManagementPage، MySharePage

**مشكلة: الجداول على الجوال**
- رغم وجود `overflow-x-auto` الا ان النصوص في الاعمدة تنضغط كثيرا
- لا يوجد مؤشر للمستخدم ان الجدول قابل للتمرير افقيا

**مشكلة: تباعد الخلايا غير متناسق**
- بعض الجداول تستخدم `py-3 px-4` والبعض `py-2 px-4`
- رؤوس الجداول: بعضها يحتوي `text-muted-foreground` والبعض لا

### 3. مشاكل الالوان والتباين

**مشكلة: استخدام الوان success/warning/info كمتغيرات CSS بدون foreground**
- الالوان `success`, `warning`, `info` معرفة كقيمة واحدة فقط بدون `foreground`
- هذا يعني ان `text-success` و `bg-success` يستخدمان نفس اللون مما قد يسبب مشاكل تباين عند استخدامهما معا

**مشكلة: تداخل الالوان في بطاقات الحسابات**
- صفحة AccountsPage تستخدم `gradient-hero text-primary-foreground` لبطاقة الملخص، لكن `primary-foreground` هو لون فاتح والنص "اجمالي الدخل" يستخدم `opacity-80` مما يقلل الوضوح

### 4. مشاكل التصميم العامة

**مشكلة: عدم وجود font-display في عناوين CardTitle**
- عناوين البطاقات `CardTitle` لا تستخدم خط Amiri الزخرفي بشكل متسق

**مشكلة: الـ Sidebar المصغر (w-16)**
- عند طي الشريط الجانبي على الديسكتوب يصبح بعرض 16 (64px) والايقونات فقط، لكن لا يوجد tooltip يوضح اسم الصفحة عند التمرير فوق الايقونة

**مشكلة: صفحة الحسابات - بطاقات الارقام على الجوال**
- الشبكة `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` تعني 6 اعمدة على الديسكتوب و2 على الجوال، مما يجعل النصوص مضغوطة

### 5. مشاكل الـ Animations

**تم اصلاحها جزئيا** - تم اضافة `forwards` لكن بعض العناصر تستخدم `animate-slide-up` و `animate-fade-in` من Tailwind config (بدون forwards) بينما اخرى تستخدم الكلاسات المخصصة من CSS

**مشكلة: تعارض بين animations في Tailwind config وCSS**
- tailwind.config.ts يعرف `animate-fade-in` و `animate-slide-up` بدون `forwards`
- index.css يعرف `.animate-fade-in` و `.animate-slide-up` مع `forwards`
- CSS utilities (من @layer utilities) لها اولوية اعلى لذا ستعمل، لكن هذا تعارض يجب تنظيفه

---

## خطة الاصلاح

### المرحلة 1: توحيد الخطوط والعناوين (13 ملف)
- اضافة `font-display` لجميع عناوين h1 في الصفحات
- توحيد احجام العناوين باستخدام `text-2xl md:text-3xl`
- الملفات: جميع صفحات dashboard و beneficiary

### المرحلة 2: تنظيف الـ Animations
- ازالة تعريفات الحركة المكررة من tailwind.config.ts او اضافة `fillMode: 'forwards'` لها
- ضمان توافق التعريفات بين CSS و Tailwind

### المرحلة 3: توحيد تصميم الجداول
- استبدال جداول HTML الخام بمكون Table من shadcn/ui
- توحيد التباعد: `py-3 px-4` لجميع الخلايا
- توحيد الوان الرؤوس: `text-muted-foreground font-medium`
- اضافة `bg-muted/50` لرؤوس جميع الجداول

### المرحلة 4: تحسين التجاوب على الجوال
- تعديل شبكة بطاقات صفحة الحسابات
- تحسين عرض الازرار في رأس الصفحات (stack vertically على الجوال)

### المرحلة 5: تحسينات تباين الالوان
- مراجعة استخدام `opacity-80` على الخلفيات الداكنة
- التأكد من ان جميع النصوص تحقق نسبة تباين WCAG AA (4.5:1)

---

## التفاصيل التقنية

### الملفات المتأثرة:
1. `tailwind.config.ts` - تنظيف تعريفات الحركة
2. `src/pages/dashboard/AdminDashboard.tsx` - خط العنوان + جدول
3. `src/pages/dashboard/PropertiesPage.tsx` - خط العنوان
4. `src/pages/dashboard/ContractsPage.tsx` - خط العنوان + جدول
5. `src/pages/dashboard/IncomePage.tsx` - خط العنوان + جدول
6. `src/pages/dashboard/ExpensesPage.tsx` - خط العنوان + جدول
7. `src/pages/dashboard/BeneficiariesPage.tsx` - خط العنوان
8. `src/pages/dashboard/ReportsPage.tsx` - خط العنوان + جداول
9. `src/pages/dashboard/AccountsPage.tsx` - خط العنوان + جدول + تجاوب
10. `src/pages/dashboard/UserManagementPage.tsx` - خط العنوان + جدول
11. `src/pages/beneficiary/BeneficiaryDashboard.tsx` - خط العنوان
12. `src/pages/beneficiary/DisclosurePage.tsx` - خط العنوان
13. `src/pages/beneficiary/MySharePage.tsx` - خط العنوان + جدول
14. `src/pages/beneficiary/FinancialReportsPage.tsx` - خط العنوان

### التغييرات النمطية لكل صفحة:
```text
قبل: <h1 className="text-3xl font-bold">العنوان</h1>
بعد: <h1 className="text-2xl md:text-3xl font-bold font-display">العنوان</h1>
```

### توحيد الجداول:
```text
قبل: <table className="w-full text-sm">
بعد: استخدام مكونات Table, TableHeader, TableBody, TableRow, TableHead, TableCell
```
