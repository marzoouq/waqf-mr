

# فحص جنائي — صفحة الإعدادات العامة (17 تبويب)

---

## 1. خريطة التبويبات والحالة

| # | التبويب | الملف | يحفظ إلى | يُستهلك في | الحالة |
|---|---------|-------|----------|-----------|--------|
| 1 | بيانات الوقف | `WaqfSettingsTab.tsx` | `app_settings` (upsert batch) | فواتير، PDF، headers | ✅ يعمل |
| 2 | الواجهة الرئيسية | `LandingPageTab.tsx` | `app_settings` (JSON: `landing_page_content`) | Landing page | ✅ يعمل |
| 3 | المظهر | `AppearanceTab.tsx` | `app_settings` (JSON: `appearance_settings`) | عنوان النظام + ThemeColorPicker | ✅ يعمل |
| 4 | شريط التنبيه | `BannerSettingsTab.tsx` | `app_settings` (JSON: `beta_banner_settings`) | BetaBanner component | ✅ يعمل |
| 5 | السنوات المالية | `FiscalYearManagementTab.tsx` | `fiscal_years` table | FiscalYearContext | ✅ يعمل |
| 6 | السُلف | `AdvanceSettingsTab.tsx` | `app_settings` (JSON: `advance_settings`) | `useAdvanceRequests` | ✅ يعمل |
| 7 | الضريبة (ZATCA) | `ZatcaSettingsTab.tsx` | `app_settings` (JSON: `zatca_settings`) + `zatca_certificates` | Edge functions | ✅ يعمل |
| 8 | صلاحيات الأدوار | `RolePermissionsTab.tsx` | `app_settings` (JSON: `role_permissions`) | `DashboardLayout` sidebar filter | ✅ يعمل |
| 9 | الأقسام | `SectionsTab.tsx` | `app_settings` (JSON: `sections_visibility`) | `DashboardLayout` sidebar filter | ✅ يعمل |
| 10 | القائمة | `MenuCustomizationTab.tsx` | `app_settings` (JSON: `menu_labels`) | `DashboardLayout` sidebar labels | ✅ يعمل |
| 11 | واجهة المستفيد | `BeneficiaryTab.tsx` | `app_settings` (JSON: `beneficiary_sections`) | `DashboardLayout` beneficiary filter | ✅ يعمل |
| 12 | الإشعارات | `NotificationsTab.tsx` | `app_settings` (JSON: `notification_settings`) + localStorage (sound) | Notification system | ✅ يعمل |
| 13 | إشعارات جماعية | `BulkNotificationsTab.tsx` | `notifications` table (insert) | Beneficiary notification feed | ✅ يعمل |
| 14 | رسائل جماعية | `BulkMessagingTab.tsx` | `conversations` + `messages` tables | Messaging system | ✅ يعمل |
| 15 | تصدير البيانات | `DataExportTab.tsx` | لا يحفظ — يصدّر CSV/XLSX | تنزيل مباشر | ✅ يعمل |
| 16 | البصمة | `BiometricSettings.tsx` | `webauthn_credentials` table | WebAuthn login | ✅ يعمل |
| 17 | الأمان | `SecurityTab.tsx` | `app_settings` (key: `idle_timeout_minutes`) | `DashboardLayout` idle timeout | ✅ يعمل |

---

## 2. التحقق من سلسلة التأثير (Settings → Consumption)

| الإعداد | يُحفظ في | يُقرأ في | هل السلسلة متصلة؟ |
|---------|---------|---------|------------------|
| `sections_visibility` | SectionsTab | DashboardLayout (سطر 171) | ✅ نعم — يفلتر القائمة الجانبية |
| `beneficiary_sections` | BeneficiaryTab | DashboardLayout (سطر 174, 218-220) | ✅ نعم — يفلتر أقسام المستفيد |
| `role_permissions` | RolePermissionsTab | DashboardLayout (سطر 168, 191-198, 208) | ✅ نعم — يفلتر حسب الدور |
| `menu_labels` | MenuCustomizationTab | DashboardLayout (سطر 166, 186, 202) | ✅ نعم — يغيّر أسماء القائمة |
| `idle_timeout_minutes` | SecurityTab | DashboardLayout (سطر 234-236) | ✅ نعم — يتحكم بمدة الخمول |
| `advance_settings` | AdvanceSettingsTab | `useAdvanceRequests` hook | ✅ نعم |
| `notification_settings` | NotificationsTab | notification hooks | ✅ نعم |
| `beta_banner_settings` | BannerSettingsTab | BetaBanner component | ✅ نعم |
| `appearance_settings` | AppearanceTab | system name display | ✅ نعم |
| `landing_page_content` | LandingPageTab | Landing page | ✅ نعم |

---

## 3. نتائج الفحص الجنائي

### ✅ لا توجد أخطاء حرجة — جميع التبويبات الـ 17 تعمل وظيفياً

كل تبويب:
- يقرأ من `app_settings` عبر `useAppSettings` hook
- يحفظ عبر `upsert` أو `updateJsonSetting`
- يُستهلك في المكان الصحيح (القائمة الجانبية، المكونات، Edge Functions)

### ملاحظات تحسينية (غير حرجة):

**1. تكرار تعريف الأقسام الافتراضية (3 مصادر مختلفة)**

| الملف | الأقسام المعرّفة |
|-------|-----------------|
| `SectionsTab.tsx` | 15 قسم (admin) |
| `BeneficiaryTab.tsx` | 12 قسم (beneficiary) |
| `RolePermissionsTab.tsx` | 16 قسم (role matrix) |

القوائم مستقلة ولا توجد `constants` مشتركة. إضافة قسم جديد تتطلب تعديل 3 ملفات + `DashboardLayout`. **خطر نسيان مكان** عند إضافة قسم مستقبلاً.

**2. `WaqfSettingsTab` لا يحفظ `vat_registration_number`**

حقل `vat_registration_number` مُعرّف في `useWaqfInfo` (سطر 10) ويُستخدم في فواتير ZATCA، لكن **لا يظهر في نموذج بيانات الوقف** (`waqfFields` لا يحتويه). يُدار حالياً من إعدادات ZATCA فقط — وهذا **سلوك مقصود** لكنه قد يُربك الناظر الذي يبحث عنه في "بيانات الوقف".

---

## 4. الخلاصة

**جميع الوظائف تعمل ومطبقة بشكل صحيح.** لا توجد تبويبات معطلة أو إعدادات بدون تأثير.

**لا تغييرات مطلوبة** — النظام سليم وظيفياً.

