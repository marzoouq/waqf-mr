

# إكمال الخطة — توحيد ثوابت الأقسام في ملف مشترك

---

## ما تم تنفيذه سابقاً (3 من 4)

| # | الإصلاح | الحالة |
|---|---------|--------|
| 1 | timeout نهائي لـ `ProtectedRoute` | ✅ تم |
| 2 | إزالة `user.id` من سجلات `AuthContext` | ✅ تم |
| 3 | استبدال `console.warn` بـ `logger.warn` في `FiscalYearContext` | ✅ تم |
| 4 | **توحيد ثوابت الأقسام** | ❌ متبقي |

---

## المشكلة المتبقية

3 ملفات تعرّف أسماء الأقسام بشكل مستقل:

| الملف | عدد الأقسام | الغرض |
|-------|------------|-------|
| `SectionsTab.tsx` | 15 قسم | إظهار/إخفاء أقسام الناظر |
| `BeneficiaryTab.tsx` | 12 قسم | إظهار/إخفاء أقسام المستفيد |
| `RolePermissionsTab.tsx` | 16 قسم | مصفوفة صلاحيات الأدوار |

إضافة قسم جديد مستقبلاً تتطلب تعديل 3 ملفات + `DashboardLayout`. خطر نسيان مكان.

---

## الحل

### 1. إنشاء `src/constants/sections.ts`
ملف مركزي يحتوي:
- `SECTION_LABELS`: قاموس `key → label` لجميع الأقسام (عربي)
- `ADMIN_SECTIONS`: مفاتيح أقسام لوحة الناظر (15)
- `BENEFICIARY_SECTIONS`: مفاتيح أقسام المستفيد (12)
- `ROLE_SECTIONS`: تعريف الأقسام مع الأدوار المؤهلة (16)

### 2. تحديث `SectionsTab.tsx`
استيراد `ADMIN_SECTIONS` و `SECTION_LABELS` بدلاً من التعريف المحلي.

### 3. تحديث `BeneficiaryTab.tsx`
استيراد `BENEFICIARY_SECTIONS` و `SECTION_LABELS` بدلاً من التعريف المحلي.

### 4. تحديث `RolePermissionsTab.tsx`
استيراد `ROLE_SECTIONS` و `SECTION_LABELS` بدلاً من المصفوفة المحلية `SECTIONS`.

---

## النتيجة
- مصدر واحد للحقيقة (single source of truth)
- إضافة قسم جديد = تعديل ملف واحد فقط
- لا تغيير في السلوك الوظيفي

