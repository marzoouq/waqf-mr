/**
 * Hook لقراءة وكتابة إعدادات الإشعارات في app_settings.notification_settings
 * يدعم مفاتيح إشعارات المستفيدين الخاصة بالعقود (افتراضي false لمنع الإرباك)
 */
import { useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';

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

const DEFAULTS: NotificationSettings = {
  contract_expiry: true,
  contract_expiry_days: 30,
  payment_delays: true,
  email_notifications: false,
  notify_beneficiary_contract_expiry: false,
  notify_beneficiary_expired_contracts: false,
};

export const useNotificationSettings = () => {
  const { settings, updateJsonSetting, isLoading } = useAppSettings();

  const notificationSettings: NotificationSettings = useMemo(() => {
    const raw = settings.notification_settings;
    if (!raw || typeof raw !== 'object') return DEFAULTS;
    return { ...DEFAULTS, ...(raw as Partial<NotificationSettings>) };
  }, [settings]);

  const updateNotificationSettings = async (next: Partial<NotificationSettings>) => {
    const merged = { ...notificationSettings, ...next };
    await updateJsonSetting('notification_settings', merged);
  };

  return { notificationSettings, updateNotificationSettings, isLoading };
};
