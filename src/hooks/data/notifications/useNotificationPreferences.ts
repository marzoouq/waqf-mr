import { useState, useCallback } from 'react';
import { defaultNotify } from '@/lib/notify';
import {
  NOTIFICATION_TONE_KEY,
  NOTIFICATION_VOLUME_KEY,
  VOLUME_OPTIONS,
  previewTone,
  type ToneId,
  type VolumeLevel,
} from './useNotifications';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const NOTIF_SOUND_KEY = STORAGE_KEYS.NOTIFICATION_SOUND;

/**
 * Hook مشترك لإدارة إعدادات صوت الإشعارات
 * يُستخدم في صفحات الإعدادات (الناظر + المستفيد)
 */
export const useNotificationPreferences = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(NOTIF_SOUND_KEY) !== 'false'; } catch { return true; }
  });

  const [selectedTone, setSelectedTone] = useState<ToneId>(() => {
    try { return (localStorage.getItem(NOTIFICATION_TONE_KEY) || 'chime') as ToneId; } catch { return 'chime'; }
  });

  const [volume, setVolume] = useState<VolumeLevel>(() => {
    try { return (localStorage.getItem(NOTIFICATION_VOLUME_KEY) || 'medium') as VolumeLevel; } catch { return 'medium'; }
  });

  const handleSoundChange = useCallback((value: boolean) => {
    setSoundEnabled(value);
    try { localStorage.setItem(NOTIF_SOUND_KEY, String(value)); } catch { /* ignored */ }
    defaultNotify.success(value ? 'تم تفعيل صوت التنبيه' : 'تم تعطيل صوت التنبيه');
  }, []);

  const handleToneChange = useCallback((tone: ToneId) => {
    setSelectedTone(tone);
    try { localStorage.setItem(NOTIFICATION_TONE_KEY, tone); } catch { /* ignored */ }
    const vol = VOLUME_OPTIONS.find(v => v.id === volume)?.gain ?? 0.5;
    previewTone(tone, vol);
  }, [volume]);

  const handleVolumeChange = useCallback((level: VolumeLevel) => {
    setVolume(level);
    try { localStorage.setItem(NOTIFICATION_VOLUME_KEY, level); } catch { /* ignored */ }
    const vol = VOLUME_OPTIONS.find(v => v.id === level)?.gain ?? 0.5;
    previewTone(selectedTone, vol);
  }, [selectedTone]);

  return {
    soundEnabled,
    selectedTone,
    volume,
    handleSoundChange,
    handleToneChange,
    handleVolumeChange,
  };
};
