import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationBell from './NotificationBell';

const baseMock = {
  markAsRead: { mutate: vi.fn() },
  markAllAsRead: { mutate: vi.fn() },
};

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    data: [],
    unreadCount: 0,
    ...baseMock,
  })),
}));

import { useNotifications } from '@/hooks/useNotifications';
const mockedUseNotifications = vi.mocked(useNotifications);

describe('NotificationBell', () => {
  it('renders bell icon', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not show counter when unreadCount is 0', () => {
    render(<NotificationBell />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 5, ...baseMock } as any);
    render(<NotificationBell />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 9+ when unread count exceeds 9', () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 15, ...baseMock } as any);
    render(<NotificationBell />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows empty message when popover opened with no notifications', async () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 0, ...baseMock } as any);
    render(<NotificationBell />);
    screen.getByRole('button').click();
    expect(await screen.findByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
