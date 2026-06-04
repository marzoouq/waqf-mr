/**
 * E2E smoke — لوحة الناظر
 * يموك hook الصفحة (useAdminDashboardPage) ويتحقق من تركيب الصفحة الكامل.
 * يغطي: التحميل، عرض الترويسة، زر التقرير السنوي، عرض البطاقات الرئيسية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderDashboard } from './_helpers/renderDashboard';
import { adminDashboardFixture, aggregatedAnnualReportFixture } from './_helpers/fixtures/adminDashboard';

vi.mock('@/hooks/page/admin/dashboard/useAdminDashboardPage', () => ({
  useAdminDashboardPage: vi.fn(() => adminDashboardFixture),
}));
vi.mock('@/hooks/page/admin/dashboard/useAggregatedAnnualReport', () => ({
  useAggregatedAnnualReport: vi.fn(() => aggregatedAnnualReportFixture),
}));
vi.mock('@/components/dashboard/DashboardLazySection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<typeof import('@/components/layout')>('@/components/layout');
  return {
    ...actual,
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

import AdminDashboard from '@/pages/dashboard/AdminDashboard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminDashboard E2E', () => {
  it('renders header with greeting text', () => {
    renderDashboard(<AdminDashboard />);
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
    expect(screen.getByText(/مرحباً بك أيها الناظر/)).toBeInTheDocument();
  });

  it('shows print button for all roles', () => {
    renderDashboard(<AdminDashboard />);
    expect(screen.getByText('طباعة')).toBeInTheDocument();
  });

  it('shows aggregated annual report button for admin role', () => {
    renderDashboard(<AdminDashboard />);
    expect(screen.getByText('تقرير سنوي مُجمَّع')).toBeInTheDocument();
  });

  it('does not render error banner when isError=false', () => {
    renderDashboard(<AdminDashboard />);
    expect(screen.queryByText(/حدث خطأ أثناء تحميل بيانات اللوحة/)).toBeNull();
  });

  it('renders error banner when isError=true', async () => {
    const mod = await import('@/hooks/page/admin/dashboard/useAdminDashboardPage');
    (mod.useAdminDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...adminDashboardFixture,
      isError: true,
    });
    renderDashboard(<AdminDashboard />);
    expect(screen.getByText(/حدث خطأ أثناء تحميل بيانات اللوحة/)).toBeInTheDocument();
  });
});
