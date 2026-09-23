/**
 * اختبارات usePageActivityTracker — تتبّع دخول وخروج المستفيد من كل صفحة.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { mockUseAuth } from '@/test/setup';

const mockLogAccessEvent = vi.fn();
vi.mock('@/lib/services/accessLogService', () => ({
  logAccessEvent: (...args: unknown[]) => mockLogAccessEvent(...args),
}));

const mockResolveClientContext = vi.fn(async () => ({ ip: '1.2.3.4', blocked: false, reason: null }));
vi.mock('@/lib/monitoring/clientContext', () => ({
  resolveClientContext: () => mockResolveClientContext(),
}));

const mockLocation = { pathname: '/dashboard', search: '' };
vi.mock('react-router-dom', () => ({ useLocation: () => mockLocation }));

import { usePageActivityTracker } from './usePageActivityTracker';

type AuthMock = Parameters<typeof mockUseAuth.mockReturnValue>[0];

const signedIn = (id = 'user-1', email = 'ben@example.com') =>
  ({
    user: { id, email },
    session: null,
    role: 'beneficiary',
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshRole: vi.fn(),
  }) as unknown as AuthMock;

const signedOut = () =>
  ({
    user: null,
    session: null,
    role: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshRole: vi.fn(),
  }) as unknown as AuthMock;

const eventsOfType = (type: string): Record<string, unknown>[] =>
  mockLogAccessEvent.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((e) => e.event_type === type);

/** حدث بالفهرس مع تأكيد وجوده — يمنع أخطاء الأنواع في الفحص الصارم. */
const eventAt = (type: string, index = 0): Record<string, unknown> => {
  const event = eventsOfType(type)[index];
  if (!event) throw new Error(`لا يوجد حدث ${type} بالفهرس ${index}`);
  return event;
};

describe('usePageActivityTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/dashboard';
    mockLocation.search = '';
    mockUseAuth.mockReturnValue(signedIn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('يسجّل زيارة الصفحة للمستخدم المسجّل', () => {
    renderHook(() => usePageActivityTracker());
    expect(eventsOfType('page_view')).toHaveLength(1);
    const view = eventAt('page_view');
    expect(view.target_path).toBe('/dashboard');
    expect(view.user_id).toBe('user-1');
    expect(view.email).toBe('ben@example.com');
  });

  it('يجلب سياق الزائر (عنوان الاتصال) مرة واحدة', () => {
    renderHook(() => usePageActivityTracker());
    expect(mockResolveClientContext).toHaveBeenCalledTimes(1);
  });

  it('لا يسجّل شيئاً للزائر غير المسجّل', () => {
    mockUseAuth.mockReturnValue(signedOut());
    renderHook(() => usePageActivityTracker());
    expect(mockLogAccessEvent).not.toHaveBeenCalled();
    expect(mockResolveClientContext).not.toHaveBeenCalled();
  });

  it('يرفق بيانات وصفية مفيدة مع الزيارة', () => {
    mockLocation.search = '?tab=shares';
    renderHook(() => usePageActivityTracker());
    const meta = eventAt('page_view').metadata as Record<string, unknown>;
    expect(meta.search).toBe('?tab=shares');
    expect(typeof meta.label).toBe('string');
    expect(meta.viewport).toMatch(/^\d+x\d+$/);
  });

  it('يسجّل الخروج مع مدة البقاء عند مغادرة الصفحة', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => usePageActivityTracker());
    vi.advanceTimersByTime(5000);
    unmount();
    expect(eventsOfType('page_exit')).toHaveLength(1);
    const exit = eventAt('page_exit');
    expect((exit.metadata as Record<string, number>).duration_seconds).toBe(5);
    expect(exit.target_path).toBe('/dashboard');
  });

  it('يتجاهل الزيارات الأقصر من ثانية (ضجيج)', () => {
    const { unmount } = renderHook(() => usePageActivityTracker());
    unmount();
    expect(eventsOfType('page_exit')).toHaveLength(0);
  });

  it('يسجّل الخروج عند إخفاء التبويب', () => {
    vi.useFakeTimers();
    renderHook(() => usePageActivityTracker());
    vi.advanceTimersByTime(3000);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(eventsOfType('page_exit')).toHaveLength(1);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('يسجّل زيارة جديدة عند تغيّر المسار', () => {
    const { rerender } = renderHook(() => usePageActivityTracker());
    mockLocation.pathname = '/beneficiary/my-share';
    rerender();
    expect(eventsOfType('page_view')).toHaveLength(2);
    expect(eventAt('page_view', 1).target_path).toBe('/beneficiary/my-share');
  });
});
