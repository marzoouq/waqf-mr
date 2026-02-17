import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

const mockInvoices = [
  { id: 'i1', invoice_number: 'INV-100', invoice_type: 'rent', amount: 8000, date: '2024-05-01', status: 'paid', file_path: 'invoices/f1.pdf', file_name: 'f1.pdf', description: '', property: { property_number: 'W1' }, contract_id: null, property_id: 'p1', expense_id: null, fiscal_year_id: 'fy1' },
  { id: 'i2', invoice_number: null, invoice_type: 'utilities', amount: 500, date: '2024-06-10', status: 'pending', file_path: null, file_name: null, description: '', property: null, contract_id: null, property_id: null, expense_id: null, fiscal_year_id: 'fy1' },
];

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: vi.fn(() => ({ data: mockInvoices, isLoading: false })),
  useInvoicesByFiscalYear: vi.fn(() => ({ data: mockInvoices, isLoading: false })),
  INVOICE_TYPE_LABELS: { rent: 'إيجار', maintenance: 'صيانة', utilities: 'مرافق' } as Record<string, string>,
  INVOICE_STATUS_LABELS: { paid: 'مدفوعة', pending: 'معلقة', cancelled: 'ملغاة' } as Record<string, string>,
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/components/invoices/InvoiceViewer', () => ({ default: () => null }));

import InvoicesViewPage from './InvoicesViewPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><InvoicesViewPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('InvoicesViewPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
  });

  it('shows subtitle', () => {
    renderPage();
    expect(screen.getByText('عرض جميع فواتير الوقف')).toBeInTheDocument();
  });

  it('shows table headers', () => {
    renderPage();
    expect(screen.getByText('النوع')).toBeInTheDocument();
    expect(screen.getByText('رقم الفاتورة')).toBeInTheDocument();
    expect(screen.getByText('المبلغ')).toBeInTheDocument();
    expect(screen.getByText('الحالة')).toBeInTheDocument();
  });

  it('displays invoice data', () => {
    renderPage();
    expect(screen.getByText('INV-100')).toBeInTheDocument();
    expect(screen.getByText('إيجار')).toBeInTheDocument();
    expect(screen.getByText('مرافق')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderPage();
    expect(screen.getByText('مدفوعة')).toBeInTheDocument();
    expect(screen.getByText('معلقة')).toBeInTheDocument();
  });

  it('shows search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('بحث في الفواتير...')).toBeInTheDocument();
  });

  it('shows view mode toggles', () => {
    renderPage();
    expect(screen.getByText('جدول')).toBeInTheDocument();
    expect(screen.getByText('شبكي')).toBeInTheDocument();
  });

  it('does not show upload or edit buttons (read-only)', () => {
    renderPage();
    expect(screen.queryByText('رفع فاتورة')).not.toBeInTheDocument();
  });
});
