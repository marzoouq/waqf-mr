import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotificationFallbackState,
  tickPoll,
  dismissBanner,
  resetFallbackBanner,
} from './fallbackPolling';

describe('fallbackPolling', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFallbackBanner();
  });

  it('returns default state with no dismissal', () => {
    const s = getNotificationFallbackState();
    expect(s.bannerDismissed).toBe(false);
    expect(s.pollIntervalSec).toBe(60);
  });

  it('marks dismissed after dismiss', () => {
    dismissBanner();
    expect(getNotificationFallbackState().bannerDismissed).toBe(true);
  });

  it('tickPoll updates lastPollAt', () => {
    expect(getNotificationFallbackState().lastPollAt).toBeNull();
    tickPoll();
    expect(getNotificationFallbackState().lastPollAt).toBeInstanceOf(Date);
  });

  it('resetFallbackBanner clears dismissal and lastPollAt', () => {
    dismissBanner();
    tickPoll();
    resetFallbackBanner();
    const s = getNotificationFallbackState();
    expect(s.bannerDismissed).toBe(false);
    expect(s.lastPollAt).toBeNull();
  });
});
