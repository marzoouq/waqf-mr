/**
 * ثوابت مفاتيح localStorage — مركزية لتسهيل التنظيف والمزامنة
 */

export const STORAGE_KEYS = {
  /** السنة المالية المختارة */
  FISCAL_YEAR: 'waqf_selected_fiscal_year',
  /** حالة الشريط الجانبي */
  SIDEBAR_OPEN: 'sidebar-open',
  /** آخر إصدار PWA معروض */
  PWA_LAST_VERSION: 'pwa_last_seen_version',
  /** تفضيل تخطي إشعارات PWA */
  PWA_SKIP_PROMPT: 'pwa_skip_prompt',
  /** آخر وقت لتحقق جلسة WebAuthn */
  WEBAUTHN_LAST_CHECK: 'webauthn_last_check',
  /** أنواع الإشعارات المعطلة */
  NOTIFICATION_DISABLED_TYPES: 'notification_disabled_types',
  /** إغلاق بانر PWA */
  PWA_BANNER_DISMISSED: 'pwa-banner-dismissed',
  /** آخر وقت تحديث PWA */
  PWA_UPDATE_TIME: 'pwa_update_time',
} as const;

/** جميع المفاتيح القابلة للمسح عند تسجيل الخروج */
export const CLEARABLE_STORAGE_KEYS = Object.values(STORAGE_KEYS);
