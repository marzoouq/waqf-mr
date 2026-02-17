import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 'admin@waqf.com' },
    role: 'admin',
    signOut: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({
    getJsonSetting: vi.fn((_key: string, def: any) => def),
    isLoading: false,
  })),
}));

vi.mock('@/components/WaqfInfoBar', () => ({ default: () => <div data-testid="waqf-info-bar" /> }));
vi.mock('@/components/NotificationBell', () => ({ default: () => <div data-testid="notification-bell" /> }));
vi.mock('@/components/PrintHeader', () => ({ default: () => <div data-testid="print-header" /> }));
vi.mock('@/components/PrintFooter', () => ({ default: () => <div data-testid="print-footer" /> }));

import DashboardLayout from './DashboardLayout';

const renderLayout = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardLayout><div data-testid="child-content">محتوى</div></DashboardLayout>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DashboardLayout', () => {
  it('renders children content', () => {
    renderLayout();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('shows app title', () => {
    renderLayout();
    const titles = screen.getAllByText('إدارة الوقف');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('shows admin navigation links', () => {
    renderLayout();
    expect(screen.getAllByText('العقارات').length).toBeGreaterThan(0);
    expect(screen.getAllByText('العقود').length).toBeGreaterThan(0);
    expect(screen.getAllByText('المستفيدين').length).toBeGreaterThan(0);
    expect(screen.getAllByText('الحسابات').length).toBeGreaterThan(0);
  });

  it('shows user email', () => {
    renderLayout();
    const emails = screen.getAllByText('admin@waqf.com');
    expect(emails.length).toBeGreaterThan(0);
  });

  it('shows role label for admin', () => {
    renderLayout();
    const labels = screen.getAllByText('ناظر الوقف');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('shows logout button', () => {
    renderLayout();
    const logoutBtns = screen.getAllByText('تسجيل الخروج');
    expect(logoutBtns.length).toBeGreaterThan(0);
  });

  it('shows beneficiary links for beneficiary role', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'ben@waqf.com' }, role: 'beneficiary', signOut: vi.fn() });
    renderLayout();
    expect(screen.getAllByText('الإفصاح السنوي').length).toBeGreaterThan(0);
    expect(screen.getAllByText('حصتي من الريع').length).toBeGreaterThan(0);
  });

  it('includes notification bell', () => {
    renderLayout();
    const bells = screen.getAllByTestId('notification-bell');
    expect(bells.length).toBeGreaterThan(0);
  });

  it('includes print header and footer', () => {
    renderLayout();
    expect(screen.getByTestId('print-header')).toBeInTheDocument();
    expect(screen.getByTestId('print-footer')).toBeInTheDocument();
  });
});
