import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockContracts = [
  { id: 'c1', contract_number: 'C-001', property_id: 'p1', unit_id: 'u1', tenant_name: 'أحمد محمد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 24000, status: 'active', payment_type: 'annual', payment_count: 1, payment_amount: 24000, notes: '', created_at: '', updated_at: '' },
  { id: 'c2', contract_number: 'C-002', property_id: 'p1', unit_id: 'u2', tenant_name: 'خالد سعد', start_date: '2023-01-01', end_date: '2024-01-01', rent_amount: 18000, status: 'expired', payment_type: 'monthly', payment_count: 12, payment_amount: 1500, notes: '', created_at: '', updated_at: '' },
];

const mockMutate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({ data: mockContracts, isLoading: false })),
  useContractsByFiscalYear: vi.fn(() => ({ data: mockContracts, isLoading: false })),
  useCreateContract: vi.fn(() => mockMutate),
  useUpdateContract: vi.fn(() => mockMutate),
  useDeleteContract: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({ data: [
    { id: 'p1', property_number: 'W-001', location: 'حي النزهة', property_type: 'مبنى', area: 500 },
  ] })),
}));

vi.mock('@/hooks/useUnits', () => ({
  useUnits: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => ({ waqfName: 'وقف تجريبي', adminName: 'ناظر' })),
}));

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock('@/utils/pdf', () => ({
  generateContractsPDF: vi.fn(),
}));

import ContractsPage from './ContractsPage';

describe('ContractsPage', () => {
  it('renders page title', () => {
    render(<ContractsPage />);
    expect(screen.getByText('إدارة العقود')).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(<ContractsPage />);
    expect(screen.getByText('إجمالي العقود')).toBeInTheDocument();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();
    expect(screen.getByText('العقود المنتهية')).toBeInTheDocument();
  });

  it('shows correct total contracts count', () => {
    render(<ContractsPage />);
    // 2 total contracts
    const totalCard = screen.getByText('إجمالي العقود').closest('div')!;
    expect(totalCard.parentElement?.textContent).toContain('2');
  });

  it('renders contract table with data', () => {
    render(<ContractsPage />);
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    expect(screen.getByText('خالد سعد')).toBeInTheDocument();
    expect(screen.getByText('C-001')).toBeInTheDocument();
  });

  it('filters contracts by search', () => {
    render(<ContractsPage />);
    const searchInput = screen.getByPlaceholderText('بحث في العقود...');
    fireEvent.change(searchInput, { target: { value: 'أحمد' } });
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    expect(screen.queryByText('خالد سعد')).not.toBeInTheDocument();
  });

  it('shows empty state when no search results', () => {
    render(<ContractsPage />);
    const searchInput = screen.getByPlaceholderText('بحث في العقود...');
    fireEvent.change(searchInput, { target: { value: 'غير موجود' } });
    expect(screen.getByText('لا توجد نتائج للبحث')).toBeInTheDocument();
  });

  it('shows add contract button', () => {
    render(<ContractsPage />);
    expect(screen.getByText('إضافة عقد')).toBeInTheDocument();
  });

  it('displays status badges correctly', () => {
    render(<ContractsPage />);
    expect(screen.getByText('نشط')).toBeInTheDocument();
    expect(screen.getByText('منتهي')).toBeInTheDocument();
  });
});
