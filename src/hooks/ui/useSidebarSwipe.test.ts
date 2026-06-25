/**
 * اختبارات useSidebarSwipe — تغطّي حالات touch المختلفة
 * مع التحقق من عدم بقاء transform عالق بعد touchcancel/touchend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarSwipe } from './useSidebarSwipe';

const makeTouchEvent = (x: number, y = 0): React.TouchEvent => ({
  touches: [{ clientX: x, clientY: y }],
} as unknown as React.TouchEvent);

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
  // rAF يُنفَّذ فوراً في الاختبارات لتبسيط التحقق
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

const setup = (mobileSidebarOpen = false) => {
  const setMobileSidebarOpen = vi.fn();
  const hook = renderHook(({ open }) =>
    useSidebarSwipe({ mobileSidebarOpen: open, setMobileSidebarOpen, sidebarWidth: 256 }),
    { initialProps: { open: mobileSidebarOpen } }
  );
  return { hook, setMobileSidebarOpen };
};

describe('useSidebarSwipe', () => {
  describe('initial state', () => {
    it('يُغلق السايدبار افتراضياً بـ translateX(256px)', () => {
      const { hook } = setup(false);
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(256px)');
    });

    it('يفتح السايدبار بـ translateX(0px) عند mobileSidebarOpen=true', () => {
      const { hook } = setup(true);
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(0px)');
    });

    it('يُطبّق transition عند عدم وجود سحب نشط', () => {
      const { hook } = setup(false);
      expect(hook.result.current.sidebarProps.style.transition).toBe('transform 250ms ease-out');
    });
  });

  describe('edge swipe-to-open', () => {
    it('لا يبدأ السحب عند لمسة خارج edge zone', () => {
      const { hook } = setup(false);
      act(() => {
        hook.result.current.mainTouchProps.onTouchStart(makeTouchEvent(100));
        hook.result.current.mainTouchProps.onTouchMove(makeTouchEvent(50));
      });
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(256px)');
    });

    it('يبدأ السحب عند لمسة في آخر 12px من الحافة اليمنى', () => {
      const { hook } = setup(false);
      act(() => {
        hook.result.current.mainTouchProps.onTouchStart(makeTouchEvent(395, 100));
        hook.result.current.mainTouchProps.onTouchMove(makeTouchEvent(350, 100));
      });
      // dragOffset = 256 - 45 = 211
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(211px)');
    });

    it('يُلغي edge swipe عند سيطرة الحركة الرأسية', () => {
      const { hook } = setup(false);
      act(() => {
        hook.result.current.mainTouchProps.onTouchStart(makeTouchEvent(395, 100));
        hook.result.current.mainTouchProps.onTouchMove(makeTouchEvent(390, 150));
      });
      // الحركة الرأسية (50) > الأفقية (5) → إلغاء
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(256px)');
    });
  });

  describe('touchcancel handling (iOS Safari fix)', () => {
    it('يُعيد ضبط dragOffset بعد touchcancel من edge swipe', () => {
      const { hook, setMobileSidebarOpen } = setup(false);
      act(() => {
        hook.result.current.mainTouchProps.onTouchStart(makeTouchEvent(395, 100));
        hook.result.current.mainTouchProps.onTouchMove(makeTouchEvent(350, 100));
      });
      // الآن transform منزاح
      act(() => {
        hook.result.current.mainTouchProps.onTouchCancel();
      });
      // بعد cancel، يعود لحالة مغلقة بدون فتح السايدبار
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(256px)');
      expect(setMobileSidebarOpen).not.toHaveBeenCalled();
    });

    it('يُعيد ضبط dragOffset بعد touchcancel على overlay', () => {
      const { hook } = setup(true);
      act(() => {
        hook.result.current.sidebarProps.onTouchStart(makeTouchEvent(50));
        hook.result.current.sidebarProps.onTouchMove(makeTouchEvent(150));
      });
      act(() => {
        hook.result.current.overlayProps.onTouchCancel();
      });
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(0px)');
    });
  });

  describe('close swipe', () => {
    it('يُغلق السايدبار عند تجاوز عتبة 80px', () => {
      const { hook, setMobileSidebarOpen } = setup(true);
      act(() => {
        hook.result.current.sidebarProps.onTouchStart(makeTouchEvent(50));
        hook.result.current.sidebarProps.onTouchMove(makeTouchEvent(150));
        hook.result.current.sidebarProps.onTouchEnd();
      });
      expect(setMobileSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('لا يُغلق عند سحب أقل من العتبة، ويعيد transform لـ translateX(0)', () => {
      const { hook, setMobileSidebarOpen } = setup(true);
      act(() => {
        hook.result.current.sidebarProps.onTouchStart(makeTouchEvent(50));
        hook.result.current.sidebarProps.onTouchMove(makeTouchEvent(80));
        hook.result.current.sidebarProps.onTouchEnd();
      });
      expect(setMobileSidebarOpen).not.toHaveBeenCalled();
      // ✅ التحقق الحاسم: transform يعود للقيمة المُدارة بـ React (لا يبقى عالقاً)
      expect(hook.result.current.sidebarProps.style.transform).toBe('translateX(0px)');
    });
  });

  describe('touchAction protection', () => {
    it('يُضيف touch-action: pan-y على mainTouchProps لمنع تعارض iOS', () => {
      const { hook } = setup(false);
      expect(hook.result.current.mainTouchProps.style.touchAction).toBe('pan-y');
    });
  });
});
