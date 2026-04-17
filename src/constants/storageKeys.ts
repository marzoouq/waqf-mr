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
  /** لون القالب */
  THEME_COLOR: 'waqf_theme_color',
  /** تفعيل البصمة */
  BIOMETRIC_ENABLED: 'waqf_biometric_enabled',
  /** صوت الإشعارات */
  NOTIFICATION_SOUND: 'waqf_notification_sound',
  /** نغمة الإشعار */
  NOTIFICATION_TONE: 'waqf_notification_tone',
  /** مستوى صوت الإشعار */
  NOTIFICATION_VOLUME: 'waqf_notification_volume',
  /** تفضيلات الإشعارات */
  NOTIFICATION_PREFS: 'waqf_notification_preferences',
  /** طابور الأخطاء غير المرسلة */
  ERROR_LOG_QUEUE: 'error_log_queue',
  /** قفل محاولات الهوية الوطنية */
  NID_LOCKED_UNTIL: 'nidLockedUntil',
} as const;

/**
 * جميع المفاتيح القابلة للمسح عند تسجيل الخروج (#70 من الفحص العميق).
 *
 * تُستهلك في `AuthContext.signOut()` لمسح كل تفضيلات المستخدم المحلية:
 *  - **مفاتيح تخص الجلسة**: FISCAL_YEAR, SIDEBAR_OPEN, NID_LOCKED_UNTIL
 *  - **تفضيلات UI**: THEME_COLOR, NOTIFICATION_*, BIOMETRIC_ENABLED
 *  - **حالة PWA**: PWA_LAST_VERSION, PWA_BANNER_DISMISSED, PWA_UPDATE_TIME
 *  - **طوابير غير مرسلة**: ERROR_LOG_QUEUE
 *
 * إضافة مفتاح جديد إلى STORAGE_KEYS أعلاه = مسحه تلقائياً عند الخروج.
 * إذا أردت مفتاحاً يبقى بعد الخروج، **لا تضعه في STORAGE_KEYS** — استخدم
 * مفتاحاً منفصلاً غير مدرج هنا.
 */
export const CLEARABLE_STORAGE_KEYS = Object.values(STORAGE_KEYS);
