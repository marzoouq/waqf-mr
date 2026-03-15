import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

beforeAll(() => {
  (globalThis as Record<string, unknown>).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useUnreadMessages', () => ({
  useUnreadMessages: () => 0,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) =>
    React.createElement('a', { href: to, className, 'data-testid': `link-${to}` }, children),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

import BottomNav from './BottomNav';

describe('BottomNav', () => {
  const onOpenSidebar = vi.fn();

  it('يعرض روابط الناظر عندما يكون الدور admin', () => {
    mockUseAuth.mockReturnValue({ role: 'admin' });
    render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('العقارات')).toBeInTheDocument();
    expect(screen.getByText('العقود')).toBeInTheDocument();
    expect(screen.getByText('الحسابات')).toBeInTheDocument();
    expect(screen.getByText('المزيد')).toBeInTheDocument();
  });

  it('يعرض روابط المستفيد عندما يكون الدور beneficiary', () => {
    mockUseAuth.mockReturnValue({ role: 'beneficiary' });
    render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    expect(screen.getByText('حصتي')).toBeInTheDocument();
    expect(screen.getByText('الإفصاح')).toBeInTheDocument();
  });

  it('يعرض روابط المحاسب عندما يكون الدور accountant', () => {
    mockUseAuth.mockReturnValue({ role: 'accountant' });
    render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    expect(screen.getByText('الدخل')).toBeInTheDocument();
    expect(screen.getByText('المصروفات')).toBeInTheDocument();
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
  });

  it('يعرض روابط الواقف عندما يكون الدور waqif', () => {
    mockUseAuth.mockReturnValue({ role: 'waqif' });
    render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    expect(screen.getByText('العقارات')).toBeInTheDocument();
    expect(screen.getByText('العقود')).toBeInTheDocument();
    expect(screen.getByText('الحسابات')).toBeInTheDocument();
  });

  it('يستدعي onOpenSidebar عند الضغط على "المزيد"', () => {
    mockUseAuth.mockReturnValue({ role: 'admin' });
    render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    fireEvent.click(screen.getByText('المزيد'));
    expect(onOpenSidebar).toHaveBeenCalledTimes(1);
  });

  it('يعرض 5 عناصر (4 روابط + زر المزيد)', () => {
    mockUseAuth.mockReturnValue({ role: 'admin' });
    const { container } = render(<BottomNav onOpenSidebar={onOpenSidebar} />);
    const navItems = container.querySelectorAll('a, button');
    expect(navItems.length).toBe(5);
  });
});
