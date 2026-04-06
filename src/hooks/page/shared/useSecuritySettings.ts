import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { defaultNotify } from '@/lib/notify';

export const useSecuritySettings = () => {
  const { data: settings, updateSetting, isLoading } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('15');

  useEffect(() => {
    if (settings?.idle_timeout_minutes) {
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
      defaultNotify.success('تم حفظ إعدادات الأمان');
    } catch {
      defaultNotify.error('حدث خطأ أثناء الحفظ');
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
