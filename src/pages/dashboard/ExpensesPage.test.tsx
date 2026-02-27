import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockExpenses = [
  { id: 'e1', expense_type: 'كهرباء', amount: 1500, date: '2024-06-01', property_id: 'p1', property: { property_number: 'W-001' }, description: 'فاتورة يونيو', fiscal_year_id: 'fy1', created_at: '' },
  { id: 'e2', expense_type: 'صيانة', amount: 3000, date: '2024-07-10', property_id: null, property: null, description: '', fiscal_year_id: 'fy1', created_at: '' },
];

const mockMutate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/useExpenses', () => ({
  useExpenses: vi.fn(() => ({ data: mockExpenses, isLoading: false })),
  useExpensesByFiscalYear: vi.fn(() => ({ data: mockExpenses, isLoading: false })),
  useCreateExpense: vi.fn(() => mockMutate),
  useUpdateExpense: vi.fn(() => mockMutate),
  useDeleteExpense: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: vi.fn(() => ({ data: [{ id: 'inv1', expense_id: 'e1' }] })),
  useInvoicesByFiscalYear: vi.fn(() => ({ data: [{ id: 'inv1', expense_id: 'e1' }] })),
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
vi.mock('@/utils/pdf', () => ({ generateExpensesPDF: vi.fn() }));
vi.mock('@/components/expenses/ExpenseAttachments', () => ({ default: () => <div>مرفقات</div> }));

import ExpensesPage from './ExpensesPage';

describe('ExpensesPage', () => {
  it('renders page title', () => {
    render(<ExpensesPage />);
    expect(screen.getByText('إدارة المصروفات')).toBeInTheDocument();
  });

  it('shows total expenses', () => {
    render(<ExpensesPage />);
    // toLocaleString('ar-SA') may render Arabic or Western numerals depending on env
    // Check for the total (4500) in any format
    const totalEl = screen.getByText('إجمالي المصروفات').closest('div')?.parentElement;
    expect(totalEl?.textContent).toMatch(/4[,٬]?500|٤[,٬]?٥٠٠/);
  });

  it('shows documentation rate', () => {
    render(<ExpensesPage />);
    // 1 out of 2 documented = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders expense table rows', () => {
    render(<ExpensesPage />);
    expect(screen.getAllByText('كهرباء').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('صيانة').length).toBeGreaterThanOrEqual(1);
  });

  it('filters expenses by search', () => {
    render(<ExpensesPage />);
    fireEvent.change(screen.getByPlaceholderText('بحث في المصروفات...'), { target: { value: 'كهرباء' } });
    expect(screen.getAllByText('كهرباء').length).toBeGreaterThanOrEqual(1);
    // "صيانة" may still appear in summary card "أعلى نوع" but should not appear in table rows
    const table = screen.getByRole('table');
    expect(table.textContent).not.toContain('صيانة');
  });

  it('shows empty state for no search results', () => {
    render(<ExpensesPage />);
    fireEvent.change(screen.getByPlaceholderText('بحث في المصروفات...'), { target: { value: 'غير موجود' } });
    expect(screen.getByText('لا توجد نتائج للبحث')).toBeInTheDocument();
  });

  it('shows add expense button', () => {
    render(<ExpensesPage />);
    expect(screen.getByText('إضافة مصروف')).toBeInTheDocument();
  });

  it('shows documented/total count', () => {
    render(<ExpensesPage />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});
