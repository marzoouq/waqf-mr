import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SidebarContent from './Sidebar';
import { Home, Settings } from 'lucide-react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@test.com' }, role: 'admin' }),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
  useWaqfInfo: vi.fn(() => ({ waqfName: 'وقف تجريبي', nazirName: 'ناظر' })),
}));

vi.mock('@/constants', () => ({
  ROLE_LABELS: { admin: 'ناظر الوقف', beneficiary: 'مستفيد' },
}));

const defaultLinks = [
  { to: '/dashboard', icon: Home, label: 'الرئيسية' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
];

const renderSidebar = (props = {}) => {
  const defaultProps = {
    links: defaultLinks,
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    setMobileSidebarOpen: vi.fn(),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...props,
  };
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SidebarContent {...defaultProps} />
    </MemoryRouter>
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
    expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument();
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
