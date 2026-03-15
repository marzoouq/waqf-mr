

# تقرير فحص التطبيق — النتائج والإصلاحات المطلوبة

## المشاكل المكتشفة

### 1. خطأ حرج: `permission denied for function has_role` (يمنع تحميل صفحة الدخول)
- **السبب**: دالة `has_role` لها صلاحية EXECUTE للـ `authenticated` فقط، بينما المستخدم غير المسجل (`anon`) يحتاج الوصول لجدول `app_settings`
- **التأثير**: صفحة `/auth` تعلق على شاشة التحميل (spinner) ولا تظهر نموذج تسجيل الدخول
- **التفسير**: سياسة RLS "Authorized roles can read settings" تستدعي `has_role()` — عندما يقيّم PostgreSQL كل سياسات SELECT، تفشل هذه السياسة للـ `anon` وتُرجع 401
- **الحل**: منح `anon` صلاحية تنفيذ `has_role` (الدالة `SECURITY DEFINER` أصلاً فلا يوجد خطر أمني)

```sql
GRANT EXECUTE ON FUNCTION public.has_role TO anon;
```

### 2. صفحة `/auth` تعلق بسبب خطأ `app_settings`
- هذا نتيجة مباشرة للمشكلة #1. بعد إصلاح صلاحيات `has_role`، سيتم حل هذا تلقائياً
- هوك `useAppSettings` يُستدعى في صفحة Auth لجلب إعداد `registration_enabled`

### 3. ملاحظات على صفحة التقرير السنوي (الجديدة)
الصفحة مبنية بشكل سليم لكن هناك ملاحظات بسيطة:
- **`annual_report_status`** لا يحتوي سياسة `is_fiscal_year_accessible` — لكن هذا مقبول لأن السياسة تفلتر بـ `status = 'published'` مباشرة
- **كود الصفحة سليم**: التبويبات، CRUD، PDF، الطباعة، النشر — كلها مربوطة بشكل صحيح

### 4. الصفحة الرئيسية (`/`) تعمل بشكل سليم
- Landing page يظهر بشكل طبيعي بدون أخطاء

---

## خطة الإصلاح

### تغيير واحد فقط — migration SQL:
```sql
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO anon;
```

هذا يحل:
- خطأ 401 على `app_settings` للمستخدم غير المسجل
- علق صفحة `/auth` على شاشة التحميل
- الدالة `SECURITY DEFINER` فلا تكشف بيانات حساسة

### لا تغييرات على الكود
الملفات الموجودة سليمة — المشكلة في صلاحيات قاعدة البيانات فقط.

