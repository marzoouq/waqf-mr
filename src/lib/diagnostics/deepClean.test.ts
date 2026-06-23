/**
 * اختبارات runDeepClean — التحقق من حماية الجلسة والمفاتيح الحرجة
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runDeepClean } from './deepClean';

vi.mock('@/lib/diagnostics/history', () => ({ clearHistory: vi.fn() }));
vi.mock('@/lib/notifications/fallbackPolling', () => ({ resetFallbackBanner: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

describe('runDeepClean', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('يحمي مفاتيح Supabase auth (sb-*) في localStorage', async () => {
    localStorage.setItem('sb-access-token', 'tok');
    localStorage.setItem('sb-refresh-token', 'ref');
    localStorage.setItem('diagnostics_history', '[]');
    await runDeepClean();
    expect(localStorage.getItem('sb-access-token')).toBe('tok');
    expect(localStorage.getItem('sb-refresh-token')).toBe('ref');
    expect(localStorage.getItem('diagnostics_history')).toBeNull();
  });

  it('يحمي fiscal_year_id في sessionStorage', async () => {
    sessionStorage.setItem('fiscal_year_id', 'fy-2024');
    sessionStorage.setItem('temp_filter', 'x');
    await runDeepClean();
    expect(sessionStorage.getItem('fiscal_year_id')).toBe('fy-2024');
    expect(sessionStorage.getItem('temp_filter')).toBeNull();
  });

  it('يمسح مفاتيح التشخيص المعروفة', async () => {
    localStorage.setItem('error_log_queue', '[]');
    localStorage.setItem('dismissed_warnings_v1', '[]');
    localStorage.setItem('tickPoll_last', '123');
    const r = await runDeepClean();
    expect(r.localStorageKeysCleared).toBeGreaterThanOrEqual(3);
  });

  it('يستدعي queryClient.clear() عند توفّره', async () => {
    const clear = vi.fn();
    const r = await runDeepClean({ queryClient: { clear } as unknown as NonNullable<Parameters<typeof runDeepClean>[0]>['queryClient'] });
    expect(clear).toHaveBeenCalledOnce();
    expect(r.queryCacheCleared).toBe(true);
  });

  it('يُرجع تقريراً صالحاً حتى مع غياب APIs', async () => {
    const r = await runDeepClean();
    expect(r).toHaveProperty('durationMs');
    expect(r).toHaveProperty('errors');
    expect(Array.isArray(r.errors)).toBe(true);
  });
});
