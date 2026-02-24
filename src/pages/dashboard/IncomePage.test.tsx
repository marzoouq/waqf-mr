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

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
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
    const totalEl = screen.getByText('إجمالي الدخل').closest('div')?.parentElement;
    expect(totalEl?.textContent).toMatch(/29[,٬]?000|٢٩[,٬]?٠٠٠/);
  });

  it('renders income table rows', () => {
    render(<IncomePage />);
    expect(screen.getAllByText('إيجار شقة 101').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('تبرع').length).toBeGreaterThanOrEqual(1);
  });

  it('filters income by search', () => {
    render(<IncomePage />);
    fireEvent.change(screen.getByPlaceholderText('بحث في سجلات الدخل...'), { target: { value: 'تبرع' } });
    expect(screen.getAllByText('تبرع').length).toBeGreaterThanOrEqual(1);
    const table = screen.getByRole('table');
    expect(table.textContent).not.toContain('إيجار شقة 101');
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
