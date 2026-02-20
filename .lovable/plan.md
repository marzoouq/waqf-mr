
# خطة التحسينات الشاملة للوحة المستفيد

## المطلوب (7 مهام)

### 1. مؤشرات تحميل (Skeleton) لجميع صفحات المستفيد

الصفحات التي تحتاج Skeleton:

| الصفحة | الحالة الحالية |
|--------|---------------|
| BeneficiaryDashboard | لا يوجد skeleton |
| DisclosurePage | لا يوجد skeleton |
| MySharePage | لديها حالة "لم يُعثر على المستفيد" فقط |
| FinancialReportsPage | لا يوجد skeleton |
| NotificationsPage | لا يوجد skeleton |
| InvoicesViewPage | يعرض "جاري التحميل..." نص فقط |
| BylawsViewPage | يعرض Loader2 spinner فقط |
| BeneficiarySettingsPage | لا يوجد skeleton |
| BeneficiaryMessagesPage | لا يوجد skeleton |

**التنفيذ**: إضافة `isLoading` check في كل صفحة وعرض `DashboardSkeleton` أو `TableSkeleton` أو `StatsGridSkeleton` من `SkeletonLoaders.tsx` حسب نوع المحتوى.

### 2. إخفاء نسبة الحصة من المستفيدين

النسبة تظهر حاليا في 4 أماكن:
- **BeneficiaryDashboard**: بطاقة "نسبة حصتي" مع CircularProgress (سطر 179-187)
- **MySharePage**: بطاقة "نسبة حصتي" (سطر 186-198)
- **DisclosurePage**: "حصتي (X%)" (سطر 291)
- **BeneficiarySettingsPage**: حقل "نسبة الحصة" (سطر 136-138)

**التنفيذ**:
- **BeneficiaryDashboard**: إزالة بطاقة CircularProgress للنسبة واستبدالها ببطاقة أخرى مفيدة (مثل عدد التوزيعات المدفوعة)
- **MySharePage**: إزالة بطاقة "نسبة حصتي" واستبدالها بشيء آخر أو تقليص الشبكة لـ 3 بطاقات
- **DisclosurePage**: تغيير "حصتي (X%)" إلى "حصتي المستحقة" بدون عرض النسبة
- **BeneficiarySettingsPage**: إزالة حقل "نسبة الحصة" من معلومات الحساب

### 3. تقييد تعديل الاسم والنسبة ورقم الهوية

هذه البيانات بالفعل read-only في صفحة الإعدادات (حقول `readOnly` مع `bg-muted/50`). لكن يجب التأكيد:
- إزالة حقل النسبة بالكامل (حسب المطلب #2)
- إبقاء الاسم ورقم الهوية read-only مع رسالة واضحة أنها تُدار من الناظر فقط

### 4. عرض العقود بنمط شبكي على الجوال (صفحة الإفصاح السنوي)

حاليا جدول العقود في `DisclosurePage` يستخدم `overflow-x-auto` مع جدول `min-w-[600px]` مما يجبر المستخدم على التمرير أفقيا على الجوال.

**التنفيذ**: إضافة عرض بطاقات (Card-based grid) على الجوال باستخدام `useIsMobile()`:
- على الجوال: عرض كل عقد كبطاقة تحتوي على المعلومات الأساسية
- على الشاشات الكبيرة: إبقاء عرض الجدول كما هو

### 5. المراسلات - إضافة آلية بدء محادثة

المشكلة: المستفيد يرى تبويبين (محادثات / دعم فني) لكن لا يمكنه بدء محادثة مباشرة مع الناظر. فقط يمكنه فتح "تذكرة دعم فني".

**التنفيذ**:
- إضافة زر "محادثة الناظر" بارز في تبويب المحادثات
- عند الضغط: إنشاء محادثة جديدة من نوع `chat` مع مربع حوار لإدخال الموضوع
- تغيير الشاشة الفارغة في قسم المحادثات لتوضيح إمكانية التواصل مع الناظر

### 6. ميزة تغيير ألوان التطبيق

**التنفيذ**:
- إضافة تبويب جديد "المظهر" في صفحة إعدادات المستفيد (`BeneficiarySettingsPage`)
- توفير 4-5 قوالب ألوان جاهزة (الأخضر الإسلامي الحالي، أزرق، بنفسجي، كحلي، خمري)
- حفظ الاختيار في `localStorage`
- تطبيق الألوان عبر CSS variables على `:root`
- إضافة نفس التبويب في صفحة إعدادات الناظر (`SettingsPage`)

### 7. نتائج الفحص العميق - إصلاحات إضافية

| المشكلة | الموقع | الإصلاح |
|---------|--------|---------|
| عدم وجود حالة خطأ | جميع الصفحات | إضافة عرض خطأ مع زر إعادة المحاولة |
| InvoicesViewPage يعرض نص "جاري التحميل" بدل skeleton | InvoicesViewPage سطر 113 | استبدال بـ TableSkeleton |
| BylawsViewPage يعرض spinner بسيط | BylawsViewPage سطر 37 | استبدال بـ skeleton مناسب |

---

## التفاصيل التقنية

### الملفات المتأثرة (10 ملفات):

1. **`src/pages/beneficiary/BeneficiaryDashboard.tsx`**
   - إضافة skeleton عند تحميل البيانات
   - إزالة بطاقة نسبة الحصة (CircularProgress) واستبدالها ببطاقة عدد الإشعارات غير المقروءة
   - إضافة حالة خطأ

2. **`src/pages/beneficiary/DisclosurePage.tsx`**
   - إضافة skeleton عند تحميل البيانات
   - تحويل جدول العقود لعرض بطاقات على الجوال
   - إزالة عرض النسبة من قسم "حصتي"
   - إضافة حالة خطأ

3. **`src/pages/beneficiary/MySharePage.tsx`**
   - إضافة skeleton عند تحميل البيانات
   - إزالة بطاقة "نسبة حصتي" وتحويل الشبكة لـ 3 أعمدة
   - إضافة حالة خطأ

4. **`src/pages/beneficiary/FinancialReportsPage.tsx`**
   - إضافة skeleton عند تحميل البيانات (ChartSkeleton + StatsGridSkeleton)
   - إضافة حالة خطأ

5. **`src/pages/beneficiary/NotificationsPage.tsx`**
   - إضافة skeleton عند تحميل الإشعارات
   - إضافة حالة خطأ

6. **`src/pages/beneficiary/InvoicesViewPage.tsx`**
   - استبدال "جاري التحميل..." بـ TableSkeleton
   - إضافة حالة خطأ

7. **`src/pages/beneficiary/BylawsViewPage.tsx`**
   - استبدال Loader2 spinner بـ skeleton مناسب
   - إضافة حالة خطأ

8. **`src/pages/beneficiary/BeneficiaryMessagesPage.tsx`**
   - إضافة skeleton عند تحميل المحادثات
   - إضافة زر وDialog لبدء محادثة جديدة مع الناظر في تبويب المحادثات
   - إضافة حالة خطأ

9. **`src/pages/beneficiary/BeneficiarySettingsPage.tsx`**
   - إزالة حقل "نسبة الحصة" من معلومات الحساب
   - إضافة تبويب "المظهر" مع خيارات ألوان جاهزة (5 قوالب)
   - إضافة skeleton عند تحميل بيانات المستفيد

10. **`src/pages/dashboard/SettingsPage.tsx`**
    - إضافة تبويب "المظهر" مع نفس خيارات الألوان المتاحة للمستفيد

### مكون جديد: نظام تغيير الألوان
- **`src/components/ThemeColorPicker.tsx`** (جديد): مكون مشترك يعرض 5 قوالب ألوان كدوائر ملونة قابلة للنقر
- القوالب: أخضر إسلامي (افتراضي)، أزرق ملكي، بنفسجي، كحلي، خمري
- يحفظ في `localStorage` ويطبق CSS variables ديناميكيا على `:root`
- يعمل مع الوضع الداكن والفاتح
