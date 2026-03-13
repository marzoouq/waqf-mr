import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('loadAmiriFonts', () => {
  beforeEach(() => {
    vi.resetModules();
    // تنظيف أي style مُضاف
    document.head.querySelectorAll('style').forEach(s => s.remove());
  });

  it('injects @font-face style into document.head', async () => {
    const { loadAmiriFonts } = await import('./loadAmiriFonts');
    loadAmiriFonts();
    const styles = document.head.querySelectorAll('style');
    const amiriStyle = Array.from(styles).find(s => s.textContent?.includes('Amiri'));
    expect(amiriStyle).toBeTruthy();
    expect(amiriStyle!.textContent).toContain('font-family');
    expect(amiriStyle!.textContent).toContain('woff2');
  });

  it('only injects once (idempotent)', async () => {
    const { loadAmiriFonts } = await import('./loadAmiriFonts');
    loadAmiriFonts();
    loadAmiriFonts();
    const styles = document.head.querySelectorAll('style');
    const amiriStyles = Array.from(styles).filter(s => s.textContent?.includes('Amiri'));
    expect(amiriStyles.length).toBe(1);
  });
});
