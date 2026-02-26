import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';

const baseMock = {
  markAsRead: { mutate: vi.fn() },
  markAllAsRead: { mutate: vi.fn() },
  deleteOne: { mutate: vi.fn() },
  deleteRead: { mutate: vi.fn() },
};

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    data: [],
    unreadCount: 0,
    ...baseMock,
  })),
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

import { useNotifications } from '@/hooks/useNotifications';
const mockedUseNotifications = vi.mocked(useNotifications);

describe('NotificationBell', () => {
  const renderBell = () => render(<MemoryRouter><NotificationBell /></MemoryRouter>);

  it('renders bell icon', () => {
    renderBell();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not show counter when unreadCount is 0', () => {
    renderBell();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 5, ...baseMock } as any);
    renderBell();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 9+ when unread count exceeds 9', () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 15, ...baseMock } as any);
    renderBell();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows empty message when popover opened with no notifications', async () => {
    mockedUseNotifications.mockReturnValue({ data: [], unreadCount: 0, ...baseMock } as any);
    renderBell();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('لا توجد إشعارات')).toBeInTheDocument();
  });
});
