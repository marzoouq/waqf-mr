import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { uiNotify } from '@/lib/notify';
import { SAVE_MESSAGES } from '@/lib/messages/pdfMessages';

export const useSecuritySettings = () => {
  const { data: settings, updateSetting, isLoading } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('15');

  useEffect(() => {
    if (settings?.idle_timeout_minutes) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة form من useAppSettings (مصدر خارجي)
      setIdleMinutes(settings.idle_timeout_minutes);
    }
  }, [settings]);

  const handleSaveIdleTimeout = async () => {
    setSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: 'idle_timeout_minutes',
        value: idleMinutes,
      });
      uiNotify.success('تم حفظ إعدادات الأمان');
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
    } finally {
      setSaving(false);
    }
  };

  return {
    isLoading,
    saving,
    idleMinutes,
    setIdleMinutes,
    handleSaveIdleTimeout,
  };
};
