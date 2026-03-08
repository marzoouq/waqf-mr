import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiariesSafe: vi.fn(() => ({ data: [
    { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10, phone: '', email: '' },
  ] })),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({ data: [
    { id: 'n1', title: 'إشعار تجريبي', message: 'رسالة تجريبية', is_read: false, created_at: '2024-06-01T00:00:00Z', type: 'info' },
  ], isLoading: false })),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false, noPublishedYears: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({ availableAmount: 100000, isLoading: false, isError: false })),
}));

vi.mock('@/hooks/useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 10, isLoading: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
            data: [], error: null,
          }),
          data: [], error: null,
        }),
        order: () => ({ data: [], error: null }),
        data: [], error: null,
      }),
    }),
    rpc: () => Promise.resolve({ data: 0, error: null }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

import BeneficiaryDashboard from './BeneficiaryDashboard';

const renderWithRouter = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('BeneficiaryDashboard', () => {
  it('renders welcome message with beneficiary name', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('محمد أحمد')).toBeInTheDocument();
  });

  it('shows "calculated after closure" for active year', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    const placeholders = screen.getAllByText('تُحسب عند الإقفال');
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it('shows share amounts when year is closed', async () => {
    const { useFiscalYear } = await import('@/contexts/FiscalYearContext');
    vi.mocked(useFiscalYear).mockReturnValue({
      fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
      fiscalYear: { id: 'fy1', label: '1446-1447', status: 'closed', start_date: '2024-01-01', end_date: '2025-01-01', published: true, created_at: '' },
      fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'closed', start_date: '2024-01-01', end_date: '2025-01-01', published: true, created_at: '' }],
      isClosed: true, isLoading: false, noPublishedYears: false,
    } as any);
    renderWithRouter(<BeneficiaryDashboard />);
    // When closed, share amount is shown instead of placeholder
    expect(screen.getByText(/100,000/)).toBeInTheDocument();
  });

  it('shows share label', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    const labels = screen.getAllByText('حصتي من الريع');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders quick links', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
    expect(screen.getAllByText('حصتي من الريع').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
    expect(screen.getByText('اللائحة التنظيمية')).toBeInTheDocument();
  });

  it('shows recent notifications', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('إشعار تجريبي')).toBeInTheDocument();
  });
});
