import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null }),
        eq: () => ({
          order: () => ({ data: [], error: null }),
          select: () => ({ data: [], error: null }),
        }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: '1', email: 'waqif@test.com' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: () => Promise.resolve({ data: 0, error: null }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'waqif@test.com' },
    role: 'waqif',
    loading: false,
  }),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => ({
    fiscalYear: { id: '1', label: '2025-2026', status: 'active', published: true },
    fiscalYearId: '1',
    isLoading: false,
    noPublishedYears: false,
  }),
  FiscalYearProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: () => ({
    totalIncome: 100000, totalExpenses: 20000, availableAmount: 80000,
    income: [], expenses: [], expensesByTypeExcludingVat: {},
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContractsByFiscalYear: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiariesSafe: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useUnits', () => ({
  useAllUnits: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/usePaymentInvoices', () => ({
  usePaymentInvoices: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/components/NoPublishedYearsNotice', () => ({ default: () => <div>no years</div> }));
vi.mock('@/components/ExportMenu', () => ({ default: () => null }));

describe('WaqifDashboard', () => {
  it('renders financial summary cards', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { default: WaqifDashboard } = await import('./WaqifDashboard');

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WaqifDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should show key financial info
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument();
  });
});
