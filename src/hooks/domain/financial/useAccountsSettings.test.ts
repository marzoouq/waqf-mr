/**
 * اختبارات إعدادات صفحة الحسابات: نسب حصة الناظر وحصة الواقف، وقيم رقبة الوقف والزكاة من حساب السنة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const s = vi.hoisted(() => ({
  settings: {} as Record<string, string | undefined>,
  mutate: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ data: s.settings, updateSetting: { mutateAsync: s.mutate } }),
}));
vi.mock('@/lib/notify', () => ({ uiNotify: { error: s.error, success: s.success } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { useAccountsSettings } from './useAccountsSettings';
import type { Account } from '@/types';

const account = (fyId: string, label: string, extra: Partial<Account> = {}) => ({
  fiscal_year_id: fyId, fiscal_year: label, zakat_amount: 300, waqf_corpus_manual: 7000,
  waqf_corpus_previous: 2500, vat_amount: 150, distributions_amount: 40000, ...extra,
}) as unknown as Account;

const fy1 = { id: 'fy-1', label: '2024-2025', status: 'active' };
const fy2 = { id: 'fy-2', label: '2025-2026', status: 'active' };

beforeEach(() => {
  s.settings = { admin_share_percentage: '12', waqif_share_percentage: '4' };
  s.mutate.mockReset(); s.error.mockReset(); s.success.mockReset();
});

describe('useAccountsSettings', () => {
  it('يقرأ النسب من الإعدادات وقيم السنة من حسابها', () => {
    const r = renderHook(() => useAccountsSettings({ selectedFY: fy1, accounts: [account('fy-1', '2024-2025')] })).result.current;
    expect(r).toMatchObject({
      adminPercent: 12, waqifPercent: 4, zakatAmount: 300,
      waqfCorpusManual: 7000, waqfCorpusPrevious: 2500, manualVat: 150, manualDistributions: 40000,
    });
  });

  it('يرجع إلى النسب الافتراضية 10% و5% عند غياب الإعداد', () => {
    s.settings = {};
    const r = renderHook(() => useAccountsSettings({ selectedFY: null, accounts: [] })).result.current;
    expect(r.adminPercent).toBe(10);
    expect(r.waqifPercent).toBe(5);
    expect(r.zakatAmount).toBe(0);
  });

  it('يرفض نسبة ناظر خارج 0–100 برسالة عربية ولا يحفظ', () => {
    const { result } = renderHook(() => useAccountsSettings({ selectedFY: fy1, accounts: [] }));
    act(() => result.current.handleAdminPercentChange('150'));
    act(() => result.current.handleWaqifPercentChange('abc'));
    expect(s.error).toHaveBeenCalledWith('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
    expect(s.error).toHaveBeenCalledWith('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
    expect(result.current.adminPercent).toBe(12);
  });

  it('التعديل اليدوي يتقدّم، ويُمسح عند تغيير السنة المالية', () => {
    const accounts = [account('fy-1', '2024-2025'), account('fy-2', '2025-2026', { zakat_amount: 900 } as Partial<Account>)];
    const { result, rerender } = renderHook((p: { fy: typeof fy1 }) => useAccountsSettings({ selectedFY: p.fy, accounts }), { initialProps: { fy: fy1 } });
    act(() => result.current.setZakatAmount(555));
    expect(result.current.zakatAmount).toBe(555);
    rerender({ fy: fy2 });
    expect(result.current.zakatAmount).toBe(900);
  });

  it('يحفظ النسبة الصحيحة مؤجَّلاً (debounce) مرة واحدة', async () => {
    vi.useFakeTimers();
    s.mutate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountsSettings({ selectedFY: fy1, accounts: [] }));
    act(() => { result.current.handleAdminPercentChange('11'); result.current.handleAdminPercentChange('9'); });
    expect(result.current.adminPercent).toBe(9);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(s.mutate).toHaveBeenCalledTimes(1);
    expect(s.mutate).toHaveBeenCalledWith({ key: 'admin_share_percentage', value: '9' });
    vi.useRealTimers();
  });
});
