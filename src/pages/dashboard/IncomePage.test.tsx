import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockIncome = [
  { id: 'i1', source: 'إيجار شقة 101', amount: 24000, date: '2024-06-01', property_id: 'p1', property: { property_number: 'W-001' }, notes: 'دفعة سنوية', fiscal_year_id: 'fy1', created_at: '', contract_id: null },
  { id: 'i2', source: 'تبرع', amount: 5000, date: '2024-07-15', property_id: null, property: null, notes: '', fiscal_year_id: 'fy1', created_at: '', contract_id: null },
];

const mockMutate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/useIncome', () => ({
  useIncome: vi.fn(() => ({ data: mockIncome, isLoading: false })),
  useIncomeByFiscalYear: vi.fn(() => ({ data: mockIncome, isLoading: false })),
  useCreateIncome: vi.fn(() => mockMutate),
  useUpdateIncome: vi.fn(() => mockMutate),
  useDeleteIncome: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({ data: [{ id: 'p1', property_number: 'W-001', location: 'حي النزهة' }] })),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/utils/pdf', () => ({ generateIncomePDF: vi.fn() }));

import IncomePage from './IncomePage';

describe('IncomePage', () => {
  it('renders page title', () => {
    render(<IncomePage />);
    expect(screen.getByText('إدارة الدخل')).toBeInTheDocument();
  });

  it('shows total income', () => {
    render(<IncomePage />);
    expect(screen.getByText(/29,000/)).toBeInTheDocument();
  });

  it('renders income table rows', () => {
    render(<IncomePage />);
    expect(screen.getByText('إيجار شقة 101')).toBeInTheDocument();
    expect(screen.getByText('تبرع')).toBeInTheDocument();
  });

  it('filters income by search', () => {
    render(<IncomePage />);
    fireEvent.change(screen.getByPlaceholderText('بحث في سجلات الدخل...'), { target: { value: 'تبرع' } });
    expect(screen.getByText('تبرع')).toBeInTheDocument();
    expect(screen.queryByText('إيجار شقة 101')).not.toBeInTheDocument();
  });

  it('shows empty state for no search results', () => {
    render(<IncomePage />);
    fireEvent.change(screen.getByPlaceholderText('بحث في سجلات الدخل...'), { target: { value: 'غير موجود' } });
    expect(screen.getByText('لا توجد نتائج للبحث')).toBeInTheDocument();
  });

  it('shows add income button', () => {
    render(<IncomePage />);
    expect(screen.getByText('إضافة دخل')).toBeInTheDocument();
  });
});
