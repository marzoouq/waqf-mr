import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SidebarContent from './Sidebar';
import { Home, Settings } from 'lucide-react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@test.com' }, role: 'admin' }),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
  useWaqfInfo: vi.fn(() => ({ data: { waqf_name: 'وقف تجريبي', waqf_founder: 'مؤسس', waqf_admin: 'ناظر' }, isLoading: false, error: null })),
}));

vi.mock('@/hooks/usePrefetchAccounts', () => ({
  usePrefetchAccounts: () => vi.fn(),
}));

vi.mock('@/constants', () => ({
  ROLE_LABELS: { admin: 'ناظر الوقف', beneficiary: 'مستفيد' },
}));

const defaultLinks = [
  { to: '/dashboard', icon: Home, label: 'الرئيسية' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
];

const renderSidebar = (props = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaultProps = {
    links: defaultLinks,
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    setMobileSidebarOpen: vi.fn(),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...props,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <SidebarContent {...defaultProps} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SidebarContent', () => {
  it('renders app title', () => {
    renderSidebar();
    expect(screen.getByText('إدارة الوقف')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderSidebar();
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
  });

  it('shows user email', () => {
    renderSidebar();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('shows role label', () => {
    renderSidebar();
    expect(screen.getByText('ناظر الوقف')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    renderSidebar();
    const buttons = screen.getAllByText('تسجيل الخروج');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('highlights active link', () => {
    renderSidebar();
    const activeLink = screen.getByText('الرئيسية').closest('a');
    expect(activeLink?.className).toContain('bg-sidebar-accent');
  });

  it('calls setMobileSidebarOpen on link click', async () => {
    const setMobileSidebarOpen = vi.fn();
    renderSidebar({ setMobileSidebarOpen });
    await userEvent.click(screen.getByText('الإعدادات'));
    expect(setMobileSidebarOpen).toHaveBeenCalledWith(false);
  });
});
