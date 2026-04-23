/**
 * Barrel — مكونات الإعدادات (settings/)
 *
 * مُجمّعة حسب المجال:
 *   - account/    : حسابات المستخدم والمستفيد
 *   - fiscal-year/: السنوات المالية والسلف
 *   - landing/    : صفحة الهبوط والشعارات والبانرات
 *   - messaging/  : الإشعارات والرسائل الجماعية
 *   - permissions/: مكونات لوحة الصلاحيات الفرعية
 *   - security/   : الأمان والمصادقة والصلاحيات
 *   - system/     : إعدادات عامة، تصدير، مظهر، قوائم
 *   - zatca/      : فاتورة إلكترونية (هيئة الزكاة)
 *
 * الأسماء العامة فقط مُعاد تصديرها هنا. للاستيراد المباشر بدون barrel
 * (مثل lazy()) استخدم المسار الكامل '@/components/settings/<domain>/<File>'.
 */

// account
export { default as AccountTab } from './account/AccountTab';
export { default as BeneficiaryTab } from './account/BeneficiaryTab';

// fiscal-year
export { default as AdvanceSettingsTab } from './fiscal-year/AdvanceSettingsTab';
export { default as FiscalYearManagementTab } from './fiscal-year/FiscalYearManagementTab';

// landing
export { default as BannerSettingsTab } from './landing/BannerSettingsTab';
export { default as LandingPageTab } from './landing/LandingPageTab';

// messaging
export { default as BulkMessagingTab } from './messaging/BulkMessagingTab';
export { default as BulkNotificationsTab } from './messaging/BulkNotificationsTab';
export { default as NotificationsTab } from './messaging/NotificationsTab';

// security
export { default as BiometricSettings } from './security/BiometricSettings';
export { default as PasswordTab } from './security/PasswordTab';
export { default as RolePermissionsTab } from './security/RolePermissionsTab';
export { default as SecurityTab } from './security/SecurityTab';

// system
export { default as AppearanceTab } from './system/AppearanceTab';
export { default as DataExportTab } from './system/DataExportTab';
export { default as MenuCustomizationTab } from './system/MenuCustomizationTab';
export { default as SectionsTab } from './system/SectionsTab';
export { default as SystemSettingsTab } from './system/SystemSettingsTab';
export { default as WaqfSettingsTab } from './system/WaqfSettingsTab';

// zatca
export { default as ZatcaOperationsLog } from './zatca/ZatcaOperationsLog';
export { default as ZatcaSettingsTab } from './zatca/ZatcaSettingsTab';

// LandingPageContent type تم نقله إلى @/types/landing — يبقى هذا re-export للتوافق العكسي
export type { LandingPageContent } from '@/types/landing';
