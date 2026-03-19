

## خطة إصلاح 3 مشاكل: Lock Warning + Chart Width + Form Fields

### المشاكل المكتشفة

**1. تحذير Lock (supabase auth)**
- الكود في `AuthContext.tsx` تم إصلاحه سابقاً (لا يوجد `getSession()` متوازي)
- لكن يوجد `getSession()` في 5 ملفات أخرى يُستدعى عند تفاعل المستخدم (ليس عند التحميل)، وهذه **لا تسبب المشكلة**
- التحذير يظهر فقط في بيئة التطوير بسبب **React StrictMode** — لا يمكن إزالته 100% بدون تعطيل StrictMode
- **الحل**: لا تغيير إضافي مطلوب — الإصلاح السابق كافٍ

**2. تحذير Chart width/height = -1**
- `ResponsiveContainer` من Recharts يحسب أبعاد سالبة عندما يكون الحاوي مخفياً أو بحجم صفر عند أول render
- **الحل**: إضافة `minWidth: 0` و `minHeight` للحاويات التي تفتقرها (بعض الملفات مثل `YearOverYearComparison.tsx` و `WaqifChartsInner.tsx`)

**3. حقول Form بدون id/name**
- حقول `<Input>` في عدة ملفات تفتقر لـ `id` و `name`:
  - `UserManagementPage.tsx` — حقل كلمة المرور (سطر 342) وتغيير كلمة المرور (سطر 786)
  - `ContractFormDialog.tsx` — عدة حقول
  - `SupportDashboardPage.tsx` — حقل ملاحظات الحل
  - حقول البحث في صفحات متعددة
- **الحل**: إضافة `id` و `name` لحقول Forms الرئيسية (خاصة كلمات المرور والبيانات المهمة)

---

### التغييرات المطلوبة

#### ملف 1: `src/pages/dashboard/UserManagementPage.tsx`
- إضافة `id` و `name` لحقل كلمة المرور في نموذج الإنشاء (سطر 342)
- إضافة `id` و `name` لحقل تغيير كلمة المرور (سطر 786)
- ربط `Label` بـ `htmlFor`

#### ملف 2: `src/components/reports/YearOverYearComparison.tsx`
- إضافة `style={{ minWidth: 0 }}` للحاويات المفقودة

#### ملف 3: `src/components/waqif/WaqifChartsInner.tsx`
- إضافة `style={{ minWidth: 0 }}` للحاوي

#### ملف 4: `src/components/contracts/ContractFormDialog.tsx`
- إضافة `id` و `name` للحقول الرئيسية

#### ملف 5: `src/pages/dashboard/SupportDashboardPage.tsx`
- إضافة `id` و `name` لحقول النموذج

### النتيجة المتوقعة
- تقليل تحذيرات Chart width من Recharts
- إزالة تحذيرات "form field without id/name"
- تحذير Lock سيبقى أحياناً في بيئة التطوير فقط (سلوك طبيعي لـ StrictMode)

