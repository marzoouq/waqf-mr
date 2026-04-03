/** منطق أصوات الإشعارات — ثوابت وبيانات */
import { STORAGE_KEYS } from '@/constants/storageKeys';

export const NOTIFICATION_TONE_KEY = STORAGE_KEYS.NOTIFICATION_TONE;
export const NOTIFICATION_VOLUME_KEY = STORAGE_KEYS.NOTIFICATION_VOLUME;
export const NOTIF_PREFS_KEY = STORAGE_KEYS.NOTIFICATION_PREFS;

export type VolumeLevel = 'high' | 'medium' | 'low';
export const VOLUME_OPTIONS: { id: VolumeLevel; label: string; gain: number }[] = [
  { id: 'high', label: 'مرتفع', gain: 1.0 },
  { id: 'medium', label: 'متوسط', gain: 0.5 },
  { id: 'low', label: 'منخفض', gain: 0.15 },
];

export type ToneId = 'chime' | 'bell' | 'drop' | 'pulse' | 'gentle';

export interface ToneOption {
  id: ToneId;
  label: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: 'chime', label: 'رنين كلاسيكي' },
  { id: 'bell', label: 'جرس' },
  { id: 'drop', label: 'قطرة ماء' },
  { id: 'pulse', label: 'نبضة' },
  { id: 'gentle', label: 'هادئ' },
];

export const getVolumeGain = (): number => {
  try {
    const level = (localStorage.getItem(NOTIFICATION_VOLUME_KEY) || 'medium') as VolumeLevel;
    return VOLUME_OPTIONS.find(v => v.id === level)?.gain ?? 0.5;
  } catch { return 0.5; }
};

export const playTone = (ctx: AudioContext, tone: ToneId, volumeMultiplier = 1.0) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  const v = volumeMultiplier;

  switch (tone) {
    case 'bell':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);
      gain.gain.setValueAtTime(0.18 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
      break;
    case 'drop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      gain.gain.setValueAtTime(0.12 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
      break;
    case 'pulse':
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(800, t + 0.1);
      osc.frequency.setValueAtTime(600, t + 0.2);
      gain.gain.setValueAtTime(0.08 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
      break;
    case 'gentle':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.setValueAtTime(660, t + 0.2);
      gain.gain.setValueAtTime(0.1 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
      break;
    default: // chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(830, t);
      osc.frequency.setValueAtTime(1050, t + 0.12);
      gain.gain.setValueAtTime(0.15 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
  }
};

export const previewTone = (tone: ToneId, volumeOverride?: number) => {
  try {
    const ctx = new AudioContext();
    const vol = volumeOverride ?? getVolumeGain();
    playTone(ctx, tone, vol);
  } catch { /* silent */ }
};
