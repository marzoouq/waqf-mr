/**
 * Smoke tests — bootstrap modules (P4).
 * Verifies each side-effect module from src/app/bootstrap/ runs without throwing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/pwaBootstrap', () => ({
  runPwaCacheGuard: vi.fn(async () => {}),
}));

vi.mock('@/lib/monitoring', () => ({
  reportPageLoadMetrics: vi.fn(),
}));

vi.mock('@/lib/monitoring/webVitals', () => ({
  initWebVitals: vi.fn(),
}));

describe('app/bootstrap — smoke', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="splash" style="opacity:1"></div><div id="root"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removeSplash يحذف عنصر splash بدون أخطاء', async () => {
    vi.useFakeTimers();
    const { removeSplash } = await import('@/app/bootstrap/removeSplash');
    expect(() => removeSplash()).not.toThrow();
    // R7: fallback ارتفع إلى 2000ms (إزالة سباق setTimeout(500) المتوازي مع transitionend)
    vi.advanceTimersByTime(2100);
    expect(document.getElementById('splash')).toBeNull();
  });

  it('removeSplash آمن عند غياب العنصر', async () => {
    document.getElementById('splash')?.remove();
    const { removeSplash } = await import('@/app/bootstrap/removeSplash');
    expect(() => removeSplash()).not.toThrow();
  });

  it('preconnectBackend يضيف <link rel="preconnect"> عند توفر VITE_SUPABASE_URL', async () => {
    const { preconnectBackend } = await import('@/app/bootstrap/preconnectBackend');
    expect(() => preconnectBackend()).not.toThrow();
    if (import.meta.env.VITE_SUPABASE_URL) {
      const link = document.head.querySelector('link[rel="preconnect"]');
      expect(link).not.toBeNull();
    }
  });

  it('registerPwa لا يرمي حتى لو فشلت الوحدة', async () => {
    const { registerPwa } = await import('@/app/bootstrap/registerPwa');
    expect(() => registerPwa()).not.toThrow();
  });

  it('initDeferredMonitoring يجدول العمل بدون أخطاء', async () => {
    const { initDeferredMonitoring } = await import('@/app/bootstrap/initMonitoring');
    expect(() => initDeferredMonitoring()).not.toThrow();
  });

  it('تنفيذ كل خطوات الإقلاع بالتسلسل بدون أخطاء', async () => {
    vi.useFakeTimers();
    const [{ preconnectBackend }, { registerPwa }, { initDeferredMonitoring }, { removeSplash }] =
      await Promise.all([
        import('@/app/bootstrap/preconnectBackend'),
        import('@/app/bootstrap/registerPwa'),
        import('@/app/bootstrap/initMonitoring'),
        import('@/app/bootstrap/removeSplash'),
      ]);

    expect(() => {
      preconnectBackend();
      registerPwa();
      initDeferredMonitoring();
      removeSplash();
    }).not.toThrow();

    vi.advanceTimersByTime(2100);
    expect(document.getElementById('splash')).toBeNull();
  });
});
