/**
 * اختبارات سلوك شريط تحديث PWA — يتحقق أن:
 *  1) لا بانر بدون نشر جديد.
 *  2) البانر يظهر عند `needRefresh=true`.
 *  3) "تحديث الآن" → `updateServiceWorker(true)` مرة واحدة + `pwa_just_updated` يُكتب.
 *  4) X (snooze) → `pwa_snoozed_version` يُحفظ.
 *  5) remount لنفس النسخة داخل 24س → البانر لا يظهر.
 *  6) remount لنسخة جديدة → البانر يظهر.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// موك على مستوى الملف قبل استيراد المكوّن
const useRegisterSWMock = vi.fn();
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opts?: unknown) => useRegisterSWMock(opts),
}));

import SwUpdateBanner from './SwUpdateBanner';

const CURRENT_FINGERPRINT =
  (import.meta.env.VITE_APP_BUILD_ID as string | undefined) ?? 'unknown';

function setupHook(opts: {
  needRefresh: boolean;
  updateSW?: ReturnType<typeof vi.fn>;
  setNeedRefresh?: ReturnType<typeof vi.fn>;
}) {
  const updateServiceWorker = opts.updateSW ?? vi.fn();
  const setNeedRefresh = opts.setNeedRefresh ?? vi.fn();
  useRegisterSWMock.mockReturnValue({
    needRefresh: [opts.needRefresh, setNeedRefresh],
    updateServiceWorker,
  });
  return { updateServiceWorker, setNeedRefresh };
}

describe('SwUpdateBanner', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useRegisterSWMock.mockReset();
  });

  it('1) لا يرسم البانر عندما needRefresh=false', () => {
    setupHook({ needRefresh: false });
    render(<SwUpdateBanner />);
    expect(screen.queryByText(/يوجد تحديث جديد للتطبيق/)).toBeNull();
  });

  it('2) يعرض البانر عندما needRefresh=true', () => {
    setupHook({ needRefresh: true });
    render(<SwUpdateBanner />);
    expect(screen.getByText(/يوجد تحديث جديد للتطبيق/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تحديث الآن/ })).toBeInTheDocument();
  });

  it('3) "تحديث الآن" يستدعي updateServiceWorker(true) مرة واحدة ويكتب pwa_just_updated', () => {
    const { updateServiceWorker } = setupHook({ needRefresh: true });
    render(<SwUpdateBanner />);

    fireEvent.click(screen.getByRole('button', { name: /تحديث الآن/ }));

    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);

    const just = localStorage.getItem('pwa_just_updated');
    expect(just).not.toBeNull();
    const parsed = JSON.parse(just as string);
    expect(parsed.version).toBe(CURRENT_FINGERPRINT);
    expect(typeof parsed.ts).toBe('number');
  });

  it('4) زر الإغلاق (X) يحفظ pwa_snoozed_version ويستدعي setNeedRefresh(false)', () => {
    const { setNeedRefresh } = setupHook({ needRefresh: true });
    render(<SwUpdateBanner />);

    fireEvent.click(screen.getByRole('button', { name: /لاحقاً/ }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    const snoozed = localStorage.getItem('pwa_snoozed_version');
    expect(snoozed).not.toBeNull();
    const parsed = JSON.parse(snoozed as string);
    expect(parsed.sw).toBe(CURRENT_FINGERPRINT);
    expect(typeof parsed.ts).toBe('number');
    expect(Date.now() - parsed.ts).toBeLessThan(2000);
  });

  it('5) remount بنفس fingerprint داخل 24س → setNeedRefresh(false) يُستدعى تلقائياً', () => {
    // محاكاة snooze سابق لنفس النسخة الحالية
    localStorage.setItem(
      'pwa_snoozed_version',
      JSON.stringify({ sw: CURRENT_FINGERPRINT, ts: Date.now() - 60 * 1000 }),
    );

    const { setNeedRefresh } = setupHook({ needRefresh: true });
    render(<SwUpdateBanner />);

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('6) remount بنسخة مختلفة (نشر جديد) → البانر يظهر ولا snooze تلقائي', () => {
    // snooze لنسخة قديمة مختلفة عن النسخة الحالية
    localStorage.setItem(
      'pwa_snoozed_version',
      JSON.stringify({ sw: 'old-version-fingerprint-xyz', ts: Date.now() - 60 * 1000 }),
    );

    const { setNeedRefresh } = setupHook({ needRefresh: true });
    render(<SwUpdateBanner />);

    expect(setNeedRefresh).not.toHaveBeenCalled();
    expect(screen.getByText(/يوجد تحديث جديد للتطبيق/)).toBeInTheDocument();
  });
});
