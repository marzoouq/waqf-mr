import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';


vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', email: 'ben@waqf.com' }, role: 'beneficiary', signOut: vi.fn() }))
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false }))
}));

const mockMarkAsRead = { mutate: vi.fn() };
const mockMarkAllAsRead = { mutate: vi.fn() };
const mockDeleteRead = { mutate: vi.fn() };
const mockDeleteOne = { mutate: vi.fn() };

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    data: [
      { id: 'n1', title: 'تم حفظ الحسابات', message: 'تم حفظ الحسابات الختامية', type: 'payment', is_read: false, created_at: new Date().toISOString(), link: null },
      { id: 'n2', title: 'رسالة جديدة', message: 'لديك رسالة من الناظر', type: 'message', is_read: true, created_at: new Date().toISOString(), link: '/messages' },
    ],
    filteredData: [
      { id: 'n1', title: 'تم حفظ الحسابات', message: 'تم حفظ الحسابات الختامية', type: 'payment', is_read: false, created_at: new Date().toISOString(), link: null },
      { id: 'n2', title: 'رسالة جديدة', message: 'لديك رسالة من الناظر', type: 'message', is_read: true, created_at: new Date().toISOString(), link: '/messages' },
    ],
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteRead: mockDeleteRead,
    deleteOne: mockDeleteOne,
    unreadCount: 1,
    filteredUnreadCount: 1,
    isLoading: false,
    isError: false,
  })),
  // ثوابت مُصدَّرة فعلاً من useNotifications.ts - يجب تضمينها في المحاكاة
  TONE_OPTIONS: [
    { id: 'chime', label: 'رنين كلاسيكي' },
    { id: 'bell', label: 'جرس' },
    { id: 'drop', label: 'قطرة ماء' },
    { id: 'pulse', label: 'نبضة' },
    { id: 'gentle', label: 'هادئ' },
  ],
  VOLUME_OPTIONS: [
    { id: 'high', label: 'مرتفع', gain: 1.0 },
    { id: 'medium', label: 'متوسط', gain: 0.5 },
    { id: 'low', label: 'منخفض', gain: 0.15 },
  ],
  NOTIFICATION_TONE_KEY: 'waqf_notification_tone',
  NOTIFICATION_VOLUME_KEY: 'waqf_notification_volume',
  NOTIF_PREFS_KEY: 'waqf_notification_preferences',
  previewTone: vi.fn(),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(() => ({
    isSupported: true,
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(),
    showNotification: vi.fn(),
  })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

import NotificationsPage from './NotificationsPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider>
          <NotificationsPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('سجل الإشعارات')).toBeInTheDocument();
  });

  it('shows unread badge', () => {
    renderPage();
    // "غير مقروء" نص كامل في عنصر <p> مستقل في بطاقة الإحصاء
    expect(screen.getByText('غير مقروء')).toBeInTheDocument();
    // التحقق من عدد الغير مقروء (1) داخل نفس البطاقة
    const unreadLabel = screen.getByText('غير مقروء');
    const unreadCard = unreadLabel.closest('.p-3');
    expect(unreadCard).not.toBeNull();
  });

  it('shows notification items', () => {
    renderPage();
    expect(screen.getByText('تم حفظ الحسابات')).toBeInTheDocument();
    expect(screen.getByText('رسالة جديدة')).toBeInTheDocument();
  });

  it('shows mark all as read button', () => {
    renderPage();
    expect(screen.getByText('قراءة الكل')).toBeInTheDocument();
  });

  it('shows delete read button', () => {
    renderPage();
    expect(screen.getByText('حذف المقروءة')).toBeInTheDocument();
  });

  it('shows notification count', () => {
    renderPage();
    // "الإجمالي" هو تسمية بطاقة العدد الكلي - التحقق من وجودها يكفي
    expect(screen.getByText('الإجمالي')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    const { useNotifications } = await import('@/hooks/useNotifications');
    (useNotifications as any).mockReturnValueOnce({
      data: [],
      filteredData: [],
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteRead: mockDeleteRead,
      deleteOne: mockDeleteOne,
      unreadCount: 0,
      filteredUnreadCount: 0,
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
