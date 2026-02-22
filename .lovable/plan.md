
# إضافة العقارات والعقود إلى لوحة المستفيد

## الملخص
إضافة صفحتين جديدتين للمستفيد (عرض فقط) للعقارات والعقود، مع إضافتهما للقائمة الجانبية.

## التغييرات المطلوبة

### 1. إضافة الروابط في القائمة الجانبية (`DashboardLayout.tsx`)
- إضافة رابطين جديدين في مصفوفة `allBeneficiaryLinks`:
  - `/beneficiary/properties` - العقارات (أيقونة Building2)
  - `/beneficiary/contracts` - العقود (أيقونة FileText)
- ستظهر بعد "الرئيسية" مباشرة

### 2. إنشاء صفحة العقارات للمستفيد (`src/pages/beneficiary/PropertiesViewPage.tsx`)
- صفحة عرض فقط (بدون إضافة/تعديل/حذف)
- عرض جدول العقارات: رقم العقار، النوع، الموقع، المساحة
- عرض الوحدات التابعة لكل عقار
- استخدام hooks الموجودة: `useProperties` و `useUnits`
- تصميم متجاوب مع عرض بطاقات على الجوال

### 3. إنشاء صفحة العقود للمستفيد (`src/pages/beneficiary/ContractsViewPage.tsx`)
- صفحة عرض فقط (بدون إضافة/تعديل/حذف)
- عرض جدول العقود: رقم العقد، المستأجر، قيمة الإيجار، تاريخ البداية/النهاية، الحالة
- ربط العقد بالعقار
- إحصائيات علوية: إجمالي العقود، النشطة، المنتهية
- استخدام hooks الموجودة: `useContracts` و `useProperties`

### 4. تسجيل المسارات في (`App.tsx`)
- إضافة مسارين جديدين:
  - `/beneficiary/properties` - مسموح لـ admin + beneficiary + waqif
  - `/beneficiary/contracts` - مسموح لـ admin + beneficiary + waqif

### 5. الأمان
- سياسات RLS موجودة مسبقا وتسمح للمستفيدين بعرض العقارات والعقود (SELECT)
- لا حاجة لتغييرات في قاعدة البيانات

## التفاصيل التقنية

### الملفات المعدلة:
1. `src/components/DashboardLayout.tsx` - إضافة رابطين في `allBeneficiaryLinks`
2. `src/App.tsx` - إضافة مسارين جديدين مع lazy loading

### الملفات الجديدة:
1. `src/pages/beneficiary/PropertiesViewPage.tsx` - صفحة عرض العقارات
2. `src/pages/beneficiary/ContractsViewPage.tsx` - صفحة عرض العقود

### Hooks المستخدمة (موجودة):
- `useProperties` - جلب العقارات
- `useUnits` / `useAllUnits` - جلب الوحدات
- `useContracts` / `useContractsByFiscalYear` - جلب العقود
- `useFiscalYear` - السنة المالية الحالية
