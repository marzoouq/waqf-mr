
# تدقيق شامل للوحة المستفيد + خطة التحسينات

## نتائج التدقيق

### 1. التكرار المؤكد
- صفحة "الحسابات الختامية" (`AccountsViewPage.tsx`) تكرر 4 أقسام كاملة من "الإفصاح السنوي" (`DisclosurePage.tsx`): الإيرادات، المصروفات، الملخص، حصة المستفيد
- المحتوى الفريد الوحيد: **جدول العقود** (6 أعمدة مع إجمالي)

### 2. القسم المفقود
- **لا توجد صفحة إعدادات** للمستفيد (لا رابط في القائمة، لا مسار في App.tsx، لا ملف)

### 3. مشاكل التوافق والوظائف المكتشفة

| المشكلة | الصفحة | التفاصيل |
|---------|--------|----------|
| FiscalYearSelector مكرر | InvoicesViewPage | الصفحة تستخدم FiscalYearSelector خاصاً بها بينما DashboardLayout يعرض واحداً بالفعل في الشريط العلوي - يظهر اثنان |
| ExportMenu مكرر | BeneficiaryDashboard | يعرض `hidePdf` لكن زر التصدير يظهر بلا وظيفة واضحة بجانب FiscalYearSelector الثاني |
| جدول التوزيعات بلا تاريخ هجري | MySharePage | التاريخ يُعرض بصيغة ميلادية خام `dist.date` بدون تنسيق |
| غياب حالة التحميل | DisclosurePage | لا يوجد مؤشر تحميل (skeleton/spinner) أثناء جلب البيانات، بعكس الصفحات الأخرى التي تستورد DashboardSkeleton لكن لا تستخدمه |
| غياب حالة الخطأ | جميع الصفحات | لا يوجد عرض لحالة الخطأ عند فشل جلب البيانات |
| زر "رجوع" غير موجود | الصفحات الداخلية | على الجوال لا يوجد طريقة سريعة للرجوع إلا عبر القائمة الجانبية |
| الرسوم البيانية على الجوال | FinancialReportsPage | 6 بطاقات إحصائية بشبكة `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` - مزدحمة على الشاشات الصغيرة جداً |

### 4. الوظائف التي تعمل بشكل سليم
- Welcome Card مع ساعة حية وتقويم مزدوج - يعمل
- CircularProgress (SVG) لنسبة الحصة - يعمل
- Realtime للتوزيعات في الرئيسية - يعمل
- المراسلات مع الدعم الفني - يعمل مع تصميم متجاوب (responsive)
- الإشعارات مع التجميع بالتاريخ والفلترة - يعمل
- اللائحة التنظيمية مع البحث والأكورديون - يعمل
- الفواتير مع عرض جدول/شبكي + بحث + ترقيم - يعمل
- تصدير PDF متاح في معظم الصفحات - يعمل
- القائمة الجانبية mobile/desktop مع طي - يعمل

---

## خطة التنفيذ

### المرحلة 1: إضافة صفحة الإعدادات الشخصية

**ملف جديد: `src/pages/beneficiary/BeneficiarySettingsPage.tsx`**

3 أقسام في صفحة واحدة باستخدام Tabs:

**تبويب "معلومات الحساب":**
- عرض الاسم (من جدول المستفيدين - قراءة فقط)
- عرض البريد الإلكتروني (قراءة فقط)
- عرض نسبة الحصة (قراءة فقط)
- عرض رقم الهوية مع إخفاء جزئي (قراءة فقط)

**تبويب "تغيير كلمة المرور":**
- حقل كلمة المرور الجديدة (8 أحرف كحد أدنى مع zod validation)
- حقل تأكيد كلمة المرور
- زر حفظ يستدعي `supabase.auth.updateUser({ password })`
- إظهار/إخفاء كلمة المرور (Eye toggle)

**تبويب "تفضيلات الإشعارات":**
- مفتاح تبديل: إشعارات التوزيعات المالية
- مفتاح تبديل: إشعارات العقود
- مفتاح تبديل: إشعارات الرسائل
- تُحفظ في localStorage (لا حاجة لجدول جديد)

### المرحلة 2: دمج "الحسابات الختامية" في "الإفصاح السنوي"

**تعديل: `src/pages/beneficiary/DisclosurePage.tsx`**
- إضافة قسم "العقود" فوق البيان المالي التفصيلي
- جدول يعرض: رقم العقد، المستأجر، الإيجار السنوي، الإيجار الشهري، الحالة
- صف إجمالي في أسفل الجدول
- استخدام `useContracts` مع فلترة بالسنة المالية

### المرحلة 3: تحديث القائمة والتوجيه

**تعديل: `src/components/DashboardLayout.tsx`**
- إزالة رابط `/beneficiary/accounts` من `allBeneficiaryLinks`
- إضافة رابط `/beneficiary/settings` مع أيقونة Settings وعنوان "الإعدادات"
- إزالة `/beneficiary/accounts` من `beneficiarySectionKeys` و `SHOW_ALL_ROUTES`

**تعديل: `src/App.tsx`**
- إضافة import وroute لـ `BeneficiarySettingsPage`
- تحويل مسار `/beneficiary/accounts` إلى redirect نحو `/beneficiary/disclosure`

**تعديل: `src/pages/beneficiary/BeneficiaryDashboard.tsx`**
- استبدال رابط "الحسابات الختامية" في quickLinks بـ "الإعدادات" أو "اللائحة التنظيمية"

### المرحلة 4: إصلاح المشاكل المكتشفة

**إصلاح FiscalYearSelector المكرر في InvoicesViewPage:**
- إزالة FiscalYearSelector المحلي واستخدام القيمة من `useFiscalYear()` context بدلاً من state محلي

**إضافة مؤشر تحميل لـ DisclosurePage:**
- إضافة skeleton/spinner أثناء جلب البيانات المالية

**تنسيق التواريخ في MySharePage:**
- تحويل `dist.date` إلى تنسيق عربي مقروء: `toLocaleDateString('ar-SA')`

---

## القائمة النهائية للمستفيد (9 عناصر):
1. الرئيسية
2. الإفصاح السنوي (مع العقود)
3. حصتي من الريع
4. التقارير المالية
5. المراسلات
6. سجل الإشعارات
7. الفواتير
8. اللائحة التنظيمية
9. الإعدادات (جديد)

## الملفات المتأثرة:
1. `src/pages/beneficiary/BeneficiarySettingsPage.tsx` -- **جديد**
2. `src/pages/beneficiary/DisclosurePage.tsx` -- إضافة جدول العقود + مؤشر تحميل
3. `src/components/DashboardLayout.tsx` -- تحديث القائمة
4. `src/App.tsx` -- إضافة مسار الإعدادات + redirect
5. `src/pages/beneficiary/BeneficiaryDashboard.tsx` -- تحديث quickLinks
6. `src/pages/beneficiary/InvoicesViewPage.tsx` -- إصلاح FiscalYearSelector المكرر
7. `src/pages/beneficiary/MySharePage.tsx` -- تنسيق التواريخ
