

# خطة إصلاح نتائج التقرير الجنائي — لوحة الناظر والهيكل العام

## التحليل

بعد فحص الكود الفعلي، هذه المشاكل **المؤكدة فعلاً** التي تستحق الإصلاح في هذه المرحلة:

### المشاكل المؤكدة

| # | المشكلة | الخطورة | مؤكد؟ |
|---|---------|---------|-------|
| 1 | ازدواجية ثوابت `DEFAULT_ADMIN_SECTIONS` + `ADMIN_SECTION_KEYS` + `BENEFICIARY_SECTION_KEYS` بين `DashboardLayout.tsx` و `constants.ts` — النسخة في DashboardLayout ناقصة (تفتقد `annual_report`, `support`, `chart_of_accounts`) | 🔴 | ✅ مؤكد |
| 2 | غياب "إجراءات فورية" للناظر — المحاسب لديه Quick Actions (سطر 368-404) لكن الناظر لا يراها | 🟠 | ✅ مؤكد |
| 3 | AdminDashboard ملف واحد 594 سطر — لكنه يستخدم lazy loading بالفعل للمكونات الثقيلة | 🟡 | ⚠️ مبالَغ — الأداء جيد بفضل lazy+Suspense |

### ما لا يحتاج إصلاح الآن

- تقسيم AdminDashboard: الملف 594 سطر فقط، يستخدم lazy loading، الأداء جيد
- تقسيم SettingsPage/ZatcaPage/SupportPage: تحسين هيكلي طويل المدى، لا أثر وظيفي
- BottomNav قابل للتخصيص: ميزة جديدة وليست خطأ
- صفحة مقارنة تاريخية: ميزة جديدة
- إشعار نشر التقرير السنوي: ميزة جديدة

## التغييرات المطلوبة (3 إصلاحات)

### 1. `src/components/DashboardLayout.tsx` — إزالة الثوابت المكررة
- **حذف** `DEFAULT_ADMIN_SECTIONS`, `DEFAULT_BENEFICIARY_SECTIONS`, `ADMIN_SECTION_KEYS`, `BENEFICIARY_SECTION_KEYS` (سطور 39-67)
- **استيراد** `defaultAdminSections`, `defaultBeneficiarySections`, `ADMIN_SECTION_KEYS`, `BENEFICIARY_SECTION_KEYS` من `@/components/dashboard-layout/constants`
- هذا يحل مشكلة عدم التزامن — النسخة المحلية تفتقد 3 أقسام جديدة

### 2. `src/pages/dashboard/AdminDashboard.tsx` — إجراءات سريعة للناظر
- توسيع قسم Quick Actions (سطر 368) ليظهر للناظر أيضاً وليس فقط المحاسب
- إضافة أزرار: "مراجعة العقود"، "إدارة المستفيدين"، "التقارير"، "الإعدادات"
- الشرط الحالي `role === 'accountant'` يصبح `role === 'accountant' || role === 'admin'` مع محتوى مختلف لكل دور

### 3. `src/pages/dashboard/AdminDashboard.tsx` — ترحيب شخصي باسم الناظر
- السطر 249 حالياً: `مرحباً بك، ناظر الوقف`
- تعديل ليستخدم `user?.email?.split('@')[0]` أو الاسم من `user_metadata` إن وُجد
- مع الحفاظ على fallback "ناظر الوقف"

## ملخص

| الملف | التغيير |
|-------|---------|
| `DashboardLayout.tsx` | إزالة 4 ثوابت مكررة واستيرادها من constants |
| `AdminDashboard.tsx` | إجراءات سريعة للناظر + ترحيب شخصي |

**إجمالي الملفات:** 2

