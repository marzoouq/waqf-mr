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
import { safeGet, safeSet } from '@/lib/storage';

const NOTIF_SOUND_KEY = STORAGE_KEYS.NOTIFICATION_SOUND;

/**
 * Hook مشترك لإدارة إعدادات صوت الإشعارات
 * يُستخدم في صفحات الإعدادات (الناظر + المستفيد)
 */
export const useNotificationPreferences = () => {
  const [soundEnabled, setSoundEnabled] = useState(
    () => safeGet<string>(NOTIF_SOUND_KEY, 'true') !== 'false',
  );

  const [selectedTone, setSelectedTone] = useState<ToneId>(
    () => safeGet<string>(NOTIFICATION_TONE_KEY, 'chime') as ToneId,
  );

  const [volume, setVolume] = useState<VolumeLevel>(
    () => safeGet<string>(NOTIFICATION_VOLUME_KEY, 'medium') as VolumeLevel,
  );

  const handleSoundChange = useCallback((value: boolean) => {
    setSoundEnabled(value);
    safeSet(NOTIF_SOUND_KEY, String(value));
    defaultNotify.success(value ? 'تم تفعيل صوت التنبيه' : 'تم تعطيل صوت التنبيه');
  }, []);

  const handleToneChange = useCallback((tone: ToneId) => {
    setSelectedTone(tone);
    safeSet(NOTIFICATION_TONE_KEY, tone);
    const vol = VOLUME_OPTIONS.find(v => v.id === volume)?.gain ?? 0.5;
    previewTone(tone, vol);
  }, [volume]);

  const handleVolumeChange = useCallback((level: VolumeLevel) => {
    setVolume(level);
    safeSet(NOTIFICATION_VOLUME_KEY, level);
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
