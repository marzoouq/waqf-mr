/**
 * أنواع إعدادات الإشعارات المشتركة
 *
 * نُقلت من `src/hooks/data/settings/useNotificationSettings.ts` لإصلاح اتجاه
 * التبعية: طبقة `lib/` (مثل `lib/notifications/beneficiaryNotificationVisibility`)
 * يجب ألا تستورد من طبقة `hooks/`.
 */

export interface NotificationSettings {
  contract_expiry: boolean;
  contract_expiry_days: number;
  payment_delays: boolean;
  email_notifications: boolean;
  /** إرسال إشعار للمستفيد عند اقتراب انتهاء العقد (افتراضي: false) */
  notify_beneficiary_contract_expiry: boolean;
  /** إرسال تذكير أسبوعي للمستفيد بالعقود المنتهية (افتراضي: false) */
  notify_beneficiary_expired_contracts: boolean;
}
