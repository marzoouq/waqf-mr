import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { toast } from 'sonner';

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
      toast.success('تم حفظ إعدادات الأمان');
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
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
