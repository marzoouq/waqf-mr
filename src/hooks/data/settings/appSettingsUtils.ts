/**
 * appSettingsUtils — helpers خالصة لتصنيف الإعدادات وتخزين تفضيلات الإشعارات
 *
 * مستخرج من useAppSettings.ts ضمن موجة P3 الختامية لفصل الاهتمامات
 * (utilities خالصة منفصلة عن hooks).
 *
 * - getCategoryFromKey: تصنيف المفاتيح (zatca/banner/general) لـ invalidation انتقائي
 * - updateNotificationPrefs: حفظ تفضيلات الإشعارات + إطلاق حدث للنافذة الحالية
 */
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeSet } from '@/lib/storage';

export type SettingsCategory = 'zatca' | 'banner' | 'general';

export const getCategoryFromKey = (key: string): SettingsCategory => {
  if (key.startsWith('zatca_') || key.startsWith('business_address_') || key.startsWith('waqf_bank_') ||
      key === 'vat_registration_number' || key === 'commercial_registration_number' || key === 'default_vat_rate') {
    return 'zatca';
  }
  if (key.startsWith('banner_') || key === 'beta_banner_enabled' || key === 'beta_banner_message') {
    return 'banner';
  }
  return 'general';
};

/**
 * #46: تحديث التفضيلات مع إطلاق حدث مخصص للنافذة الحالية
 */
export const updateNotificationPrefs = (prefs: Record<string, boolean>) => {
  safeSet(STORAGE_KEYS.NOTIFICATION_PREFS, prefs);
  try { window.dispatchEvent(new CustomEvent('notif-prefs-changed')); } catch { /* silent */ }
};
