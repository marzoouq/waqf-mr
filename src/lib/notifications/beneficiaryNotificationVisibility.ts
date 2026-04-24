/**
 * طبقة حماية لإخفاء إشعارات العقود الإدارية عن المستفيد
 *
 * يستخدمها `useNotifications` لتصفية رسائل "اقتراب انتهاء عقد" و
 * "العقود المنتهية" عندما يعطّلها الناظر في إعدادات الإشعارات،
 * حتى لو وُجدت بيانات قديمة في `notifications`.
 */
import type { Notification } from '@/types';
import type { NotificationSettings } from '@/hooks/data/settings/useNotificationSettings';

/** يطابق إشعار "اقتراب انتهاء عقد" — عبر العنوان أو الرسالة */
const isContractExpiringSoon = (n: Pick<Notification, 'title' | 'message'>): boolean => {
  const t = n.title || '';
  const m = n.message || '';
  return (
    t.includes('عقد قارب') ||
    t.includes('قارب على الانتهاء') ||
    m.includes('قارب على الانتهاء')
  );
};

/** يطابق إشعار "عقود منتهية بحاجة لمتابعة" */
const isExpiredContractsReminder = (n: Pick<Notification, 'title' | 'message'>): boolean => {
  const t = n.title || '';
  const m = n.message || '';
  return (
    t.includes('عقود منتهية') ||
    m.includes('عقود منتهية بحاجة')
  );
};

/** يحدّد إن كان الإشعار من النوع الإداري الخاص بالعقود */
export const isAdminContractNotification = (
  n: Pick<Notification, 'title' | 'message'>
): boolean => isContractExpiringSoon(n) || isExpiredContractsReminder(n);

/**
 * يقرر إخفاء الإشعار عن المستفيد بناءً على الإعدادات.
 * - إن كان "اقتراب انتهاء" والميزة معطّلة → إخفاء
 * - إن كان "عقود منتهية" والميزة معطّلة → إخفاء
 */
export const shouldHideForBeneficiary = (
  n: Pick<Notification, 'title' | 'message'>,
  settings: Pick<NotificationSettings, 'notify_beneficiary_contract_expiry' | 'notify_beneficiary_expired_contracts'>
): boolean => {
  if (!settings.notify_beneficiary_contract_expiry && isContractExpiringSoon(n)) return true;
  if (!settings.notify_beneficiary_expired_contracts && isExpiredContractsReminder(n)) return true;
  return false;
};
