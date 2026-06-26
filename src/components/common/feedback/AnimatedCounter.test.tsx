import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AnimatedCounter from './AnimatedCounter';

describe('AnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعرض القيمة النهائية بعد انتهاء الحركة', () => {
    render(<AnimatedCounter value={1000} duration={500} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // قد تختلف الأرقام العربية، نتأكد من aria-label
    expect(screen.getByLabelText('1000')).toBeInTheDocument();
  });

  it('يحترم prefers-reduced-motion ويعرض القيمة فوراً', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    render(<AnimatedCounter value={500} prefix="$" suffix="!" />);
    expect(screen.getByLabelText('$500!')).toBeInTheDocument();

    window.matchMedia = original;
  });
});
