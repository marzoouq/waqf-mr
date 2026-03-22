import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary', loading: false })),
}));

vi.mock('@/hooks/useBeneficiaryDashboardData', () => ({
  useBeneficiaryDashboardData: vi.fn(() => ({
    data: {
      beneficiary: { id: 'b1', name: 'محمد أحمد', share_percentage: 10 },
      total_beneficiary_percentage: 100,
      fiscal_year: { id: 'fy1', label: '1446-1447', status: 'active' },
      total_income: 500000,
      total_expenses: 100000,
      account: null,
      available_amount: 0,
      my_share: 0,
      recent_distributions: [],
      pending_advance_count: 0,
      advance_settings: { enabled: true, min_amount: 500, max_percentage: 50 },
    },
    isLoading: false,
    isError: false,
  })),
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

vi.mock('@/hooks/useBfcacheSafeChannel', () => ({
  useBfcacheSafeChannel: vi.fn(() => null),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
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

    const { useBeneficiaryDashboardData } = await import('@/hooks/useBeneficiaryDashboardData');
    vi.mocked(useBeneficiaryDashboardData).mockReturnValue({
      data: {
        beneficiary: { id: 'b1', name: 'محمد أحمد', share_percentage: 10 },
        total_beneficiary_percentage: 100,
        fiscal_year: { id: 'fy1', label: '1446-1447', status: 'closed' },
        total_income: 500000,
        total_expenses: 100000,
        account: { admin_share: 40000, waqif_share: 20000, waqf_revenue: 340000, vat_amount: 0, zakat_amount: 0, net_after_expenses: 400000, net_after_vat: 400000, waqf_corpus_manual: 0, waqf_corpus_previous: 0, distributions_amount: 0 },
        available_amount: 340000,
        my_share: 34000,
        recent_distributions: [],
        pending_advance_count: 0,
        advance_settings: { enabled: true, min_amount: 500, max_percentage: 50 },
      },
      isLoading: false,
      isError: false,
    } as any);

    renderWithRouter(<BeneficiaryDashboard />);
    // When closed, share amount is shown
    expect(screen.getByText(/34,000/)).toBeInTheDocument();
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
  });

  it('shows recent notifications', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('إشعار تجريبي')).toBeInTheDocument();
  });
});
