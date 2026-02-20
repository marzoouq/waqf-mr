import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
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
    isClosed: false, isLoading: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({
    beneficiaries: [{ id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 }],
    currentAccount: null,
    totalIncome: 200000, totalExpenses: 50000, netAfterVat: 180000,
    adminShare: 18000, waqifShare: 9000, waqfRevenue: 153000,
    waqfCorpusManual: 0, vatAmount: 20000, zakatAmount: 0,
    netAfterExpenses: 150000, availableAmount: 100000,
    isLoading: false, isError: false,
  })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/utils/pdf', () => ({ generateMySharePDF: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
}));

import MySharePage from './MySharePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MySharePage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MySharePage', () => {
  it('renders page title', async () => {
    renderPage();
    expect(await screen.findByText('حصتي من الريع')).toBeInTheDocument();
  });

  it('shows share info', async () => {
    renderPage();
    expect(await screen.findByText(/10,000/)).toBeInTheDocument();
  });

  it('calculates entitled share (10% of 100000)', async () => {
    renderPage();
    expect(await screen.findByText(/10,000/)).toBeInTheDocument();
  });

  it('shows distributions history section', async () => {
    renderPage();
    expect(await screen.findByText('سجل التوزيعات')).toBeInTheDocument();
  });

  it('shows empty distributions message', async () => {
    renderPage();
    expect(await screen.findByText('لا توجد توزيعات مسجلة بعد')).toBeInTheDocument();
  });

  it('shows link to disclosure page', async () => {
    renderPage();
    expect(await screen.findByText('صفحة الإفصاح السنوي')).toBeInTheDocument();
  });
});
