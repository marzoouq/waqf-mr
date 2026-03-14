import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// موك useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// موك supabase channel
const mockSubscribe = vi.fn().mockReturnValue({});
const mockOn: ReturnType<typeof vi.fn> = vi.fn();
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
});

describe('useRealtimeAlerts', () => {
  it('لا يُشترك إذا لم يوجد user', async () => {
    mockUseAuth.mockReturnValue({ user: null, role: null });
    const { useRealtimeAlerts } = await import('./useRealtimeAlerts');
    renderHook(() => useRealtimeAlerts());
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('لا يُشترك إذا كان الدور beneficiary', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, role: 'beneficiary' });
    const { useRealtimeAlerts } = await import('./useRealtimeAlerts');
    renderHook(() => useRealtimeAlerts());
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('يُشترك عند admin', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, role: 'admin' });
    const mockNavigate = vi.fn();
    const { useRealtimeAlerts } = await import('./useRealtimeAlerts');
    renderHook(() => useRealtimeAlerts(mockNavigate));
    expect(mockChannel).toHaveBeenCalledWith('admin-realtime-alerts-u1');
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('يُشترك عند accountant', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2' }, role: 'accountant' });
    const { useRealtimeAlerts } = await import('./useRealtimeAlerts');
    renderHook(() => useRealtimeAlerts());
    expect(mockChannel).toHaveBeenCalledWith('admin-realtime-alerts-u2');
  });

  it('يُنظّف القناة عند unmount', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u3' }, role: 'admin' });
    const { useRealtimeAlerts } = await import('./useRealtimeAlerts');
    const { unmount } = renderHook(() => useRealtimeAlerts());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
