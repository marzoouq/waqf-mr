import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1', email: 'ben@waqf.com' }, role: 'beneficiary', signOut: vi.fn() })),
}));

vi.mock('@/hooks/data/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: any) => d), isLoading: false })),
}));

vi.mock('@/hooks/data/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({ name: 'وقف' })) }));

vi.mock('@/hooks/financial/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447' }, fiscalYears: [{ id: 'fy1', label: '1446-1447' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447' }] })),
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


vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/common/ExportMenu', () => ({ default: (_props: any) => <button data-testid="export-menu">تصدير</button> }));
vi.mock('@/components/layout/FiscalYearSelector', () => ({ default: () => <div data-testid="fiscal-year-selector" /> }));
vi.mock('@/components/common/NoPublishedYearsNotice', () => ({ default: () => null }));
vi.mock('@/utils/pdf', () => ({ generateAccountsPDF: vi.fn().mockResolvedValue(undefined) }));

import AccountsViewPage from './AccountsViewPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AccountsViewPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AccountsViewPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الحسابات الختامية')).toBeInTheDocument();
  });

  it('shows summary section', () => {
    renderPage();
    expect(screen.getByText('ملخص الحسابات')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الدخل')).toBeInTheDocument();
    expect(screen.getAllByText('إجمالي المصروفات').length).toBeGreaterThan(0);
  });

  it('shows my share card', () => {
    renderPage();
    // Proportional: 20% / 20% total = 100% of 60000 = 60,000
    expect(screen.getByText(/60,000/)).toBeInTheDocument();
  });

  it('shows financial summary values', () => {
    renderPage();
    // The page shows these labels in the summary grid
    expect(screen.getByText('الصافي بعد الزكاة')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي القابل للتوزيع')).toBeInTheDocument();
    expect(screen.getAllByText(/حصتي المستحقة/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows link to disclosure page', () => {
    renderPage();
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
  });
});
