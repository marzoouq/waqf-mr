

# خطة: إعدادات السُلف للناظر + تحسين بطاقات الحالة

## ملخص
إضافة 3 إعدادات جديدة في `app_settings` يتحكم بها الناظر:
1. **إظهار/إخفاء** صفحة السُلف للمستفيدين (`advances_enabled`)
2. **الحد الأدنى** للسلفة (`advance_min_amount`)
3. **الحد الأقصى** كنسبة من الحصة (`advance_max_percentage` — حالياً مثبت 50%)

مع تحسين بطاقات السُلف بأيقونات حالة وتصميم أغنى.

---

## التغييرات المطلوبة

### 1. تبويب إعدادات السُلف في صفحة الإعدادات
**ملف جديد:** `src/components/settings/AdvanceSettingsTab.tsx`

واجهة بسيطة تحتوي:
- **Switch** لتفعيل/تعطيل السُلف (`advances_enabled` — default: `true`)
- **Input** للحد الأدنى (`advance_min_amount` — default: `500`)
- **Input** للحد الأقصى كنسبة مئوية (`advance_max_percentage` — default: `50`)
- زر حفظ يستخدم `useAppSettings().updateJsonSetting`

لا حاجة لـ migration — جدول `app_settings` يدعم `upsert` بالفعل.

### 2. تعديل `src/pages/dashboard/SettingsPage.tsx`
- إضافة lazy import لـ `AdvanceSettingsTab`
- إضافة تبويب جديد "السُلف" مع أيقونة `Banknote`

### 3. تعديل `src/pages/beneficiary/MySharePage.tsx`
**إخفاء قسم السُلف بالكامل عند التعطيل:**
- قراءة `advances_enabled` من `useAppSettings()`
- إخفاء زر "طلب سلفة" وقسم "سجل السُلف" وبطاقة "السُلف المصروفة" عندما يكون `false`

**تطبيق الحد الأدنى والأقصى:**
- تمرير `advance_min_amount` و`advance_max_percentage` إلى `AdvanceRequestDialog`

**تحسين بطاقات الحالة:**
- إضافة أيقونات (`Clock`, `CheckCircle`, `Banknote`, `XCircle`) لكل حالة في `getAdvanceStatusBadge`
- إضافة شريط جانبي ملون (`border-r-4`) حسب الحالة في بطاقات الجوال
- عرض `paid_at` عند الحالة "مصروف"

### 4. تعديل `src/components/beneficiaries/AdvanceRequestDialog.tsx`
- استقبال props جديدة: `minAmount` و`maxPercentage`
- تغيير `effectiveShare * 0.5` إلى `effectiveShare * (maxPercentage / 100)`
- إضافة validation للحد الأدنى مع رسالة خطأ

### 5. تعديل `src/components/accounts/AdvanceRequestsTab.tsx` (لوحة الناظر)
- قراءة إعدادات السُلف وعرض حالة التفعيل في الأعلى
- تفعيل جميع الأزرار (موافقة/رفض/تأكيد صرف) — هي مفعلة بالفعل

---

## الملفات المتأثرة: 5 ملفات
- `src/components/settings/AdvanceSettingsTab.tsx` — جديد
- `src/pages/dashboard/SettingsPage.tsx` — إضافة تبويب
- `src/pages/beneficiary/MySharePage.tsx` — إخفاء/إظهار + تحسين بطاقات
- `src/components/beneficiaries/AdvanceRequestDialog.tsx` — حدود ديناميكية
- `src/components/accounts/AdvanceRequestsTab.tsx` — عرض حالة التفعيل

