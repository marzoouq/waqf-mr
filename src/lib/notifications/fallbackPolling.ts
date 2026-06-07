/**
 * إشعارات بديلة عبر polling عند رفض/عدم دعم Notification API.
 * لا queue للإرسال (push يحتاج SW وهو خارج النطاق).
 */
import { logger } from '@/lib/logger';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const BANNER_DISMISS_KEY = 'notif_fallback_dismissed_v1';
const POLL_INTERVAL_SEC = 60;

let lastPollAt: Date | null = null;

export function getNotificationPermission(): NotifPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifPermission;
}

export interface FallbackState {
  permission: NotifPermission;
  pollingActive: boolean;
  lastPollAt: Date | null;
  pollIntervalSec: number;
  bannerDismissed: boolean;
}

export function getNotificationFallbackState(): FallbackState {
  const permission = getNotificationPermission();
  const pollingActive = permission !== 'granted';
  let bannerDismissed = false;
  try {
    if (typeof localStorage !== 'undefined') {
      bannerDismissed = localStorage.getItem(BANNER_DISMISS_KEY) === '1';
    }
  } catch (e) {
    logger.warn('[fallbackPolling] localStorage read failed:', e);
  }
  return { permission, pollingActive, lastPollAt, pollIntervalSec: POLL_INTERVAL_SEC, bannerDismissed };
}

export function tickPoll(): void {
  lastPollAt = new Date();
}

export function dismissBanner(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(BANNER_DISMISS_KEY, '1');
  } catch (e) {
    logger.warn('[fallbackPolling] localStorage write failed:', e);
  }
}

export function resetFallbackBanner(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(BANNER_DISMISS_KEY);
  } catch {
    /* noop */
  }
  lastPollAt = null;
}

export async function requestPermissionAgain(): Promise<NotifPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const r = await Notification.requestPermission();
    return r as NotifPermission;
  } catch (e) {
    logger.warn('[fallbackPolling] requestPermission failed:', e);
    return getNotificationPermission();
  }
}
