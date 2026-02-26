import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BeneficiariesPage from './BeneficiariesPage';

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
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

const mockBeneficiaries = [
  { id: 'b1', name: 'أحمد علي', share_percentage: 25, phone: '0501234567', email: 'ahmed@test.com', bank_account: 'SA123456', national_id: '1234567890', user_id: 'u1', notes: '', created_at: '', updated_at: '' },
  { id: 'b2', name: 'خالد سعد', share_percentage: 15, phone: '', email: '', bank_account: '', national_id: '', user_id: null, notes: '', created_at: '', updated_at: '' },
  { id: 'b3', name: 'سارة محمد', share_percentage: 10, phone: '0509876543', email: '', bank_account: '', national_id: '', user_id: null, notes: 'ملاحظة', created_at: '', updated_at: '' },
];

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiaries: () => ({ data: mockBeneficiaries, isLoading: false }),
  useCreateBeneficiary: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBeneficiary: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteBeneficiary: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: () => ({ waqfName: 'وقف تجريبي', nazirName: 'ناظر' }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <BeneficiariesPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('BeneficiariesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('إدارة المستفيدين')).toBeInTheDocument();
  });

  it('renders add beneficiary button', () => {
    renderPage();
    expect(screen.getByText('إضافة مستفيد')).toBeInTheDocument();
  });

  it('renders beneficiary count card', () => {
    renderPage();
    expect(screen.getByText('عدد المستفيدين')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders total percentage card', () => {
    renderPage();
    expect(screen.getByText('مجموع النسب')).toBeInTheDocument();
    expect(screen.getByText('50.00%')).toBeInTheDocument();
  });

  it('renders beneficiary names', () => {
    renderPage();
    expect(screen.getByText('أحمد علي')).toBeInTheDocument();
    expect(screen.getByText('خالد سعد')).toBeInTheDocument();
    expect(screen.getByText('سارة محمد')).toBeInTheDocument();
  });

  it('renders share percentages', () => {
    renderPage();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
    expect(screen.getByText('15.00%')).toBeInTheDocument();
    expect(screen.getByText('10.00%')).toBeInTheDocument();
  });

  it('shows linked badge for linked beneficiary', () => {
    renderPage();
    expect(screen.getByText('مرتبط')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('بحث في المستفيدين...')).toBeInTheDocument();
  });

  it('renders export menu', () => {
    renderPage();
    expect(screen.getByText('تصدير')).toBeInTheDocument();
  });
});
