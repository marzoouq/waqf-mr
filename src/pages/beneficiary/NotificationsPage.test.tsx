import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', email: 'ben@waqf.com' }, role: 'beneficiary', signOut: vi.fn() })),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
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
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteRead: mockDeleteRead,
    deleteOne: mockDeleteOne,
    unreadCount: 1,
  })),
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
    expect(screen.getByText(/1 غير مقروء/)).toBeInTheDocument();
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
    expect(screen.getByText(/2 إشعار/)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    const { useNotifications } = await import('@/hooks/useNotifications');
    (useNotifications as any).mockReturnValueOnce({
      data: [], markAsRead: mockMarkAsRead, markAllAsRead: mockMarkAllAsRead,
      deleteRead: mockDeleteRead, deleteOne: mockDeleteOne, unreadCount: 0,
    });
    renderPage();
    expect(screen.getByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
