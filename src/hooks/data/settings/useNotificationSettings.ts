/**
 * Hook لقراءة وكتابة إعدادات الإشعارات في app_settings.notification_settings
 * يدعم مفاتيح إشعارات المستفيدين الخاصة بالعقود (افتراضي false لمنع الإرباك)
 */
import { useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import type { NotificationSettings } from '@/types/notifications';

// إعادة تصدير للحفاظ على التوافق الخلفي مع الاستيرادات القائمة
export type { NotificationSettings } from '@/types/notifications';

const DEFAULTS: NotificationSettings = {
  contract_expiry: true,
  contract_expiry_days: 30,
  payment_delays: true,
  email_notifications: false,
  notify_beneficiary_contract_expiry: false,
  notify_beneficiary_expired_contracts: false,
};

export const useNotificationSettings = () => {
  const { getJsonSetting, updateJsonSetting, isLoading, data } = useAppSettings();

  const notificationSettings: NotificationSettings = useMemo(() => {
    const raw = getJsonSetting<Partial<NotificationSettings>>('notification_settings', {});
    return { ...DEFAULTS, ...raw };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const updateNotificationSettings = async (next: Partial<NotificationSettings>) => {
    const merged = { ...notificationSettings, ...next };
    await updateJsonSetting('notification_settings', merged);
  };

  return { notificationSettings, updateNotificationSettings, isLoading };
};
