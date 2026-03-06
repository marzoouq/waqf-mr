import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

const mockInvoices = [
  { id: 'i1', invoice_number: 'INV-001', invoice_type: 'rent', amount: 5000, date: '2024-06-01', status: 'paid', file_path: 'invoices/test.pdf', file_name: 'test.pdf', description: 'فاتورة إيجار', property: { property_number: 'P1' }, contract_id: null, property_id: 'p1', expense_id: null, fiscal_year_id: 'fy1' },
  { id: 'i2', invoice_number: 'INV-002', invoice_type: 'maintenance', amount: 1500, date: '2024-07-15', status: 'pending', file_path: null, file_name: null, description: 'صيانة', property: null, contract_id: null, property_id: null, expense_id: null, fiscal_year_id: 'fy1' },
];

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: vi.fn(() => ({ data: mockInvoices, isLoading: false })),
  useInvoicesByFiscalYear: vi.fn(() => ({ data: mockInvoices, isLoading: false })),
  useCreateInvoice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateInvoice: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteInvoice: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useGenerateInvoicePdf: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  uploadInvoiceFile: vi.fn(),
  INVOICE_TYPE_LABELS: { rent: 'إيجار', maintenance: 'صيانة', utilities: 'مرافق' } as Record<string, string>,
  INVOICE_STATUS_LABELS: { paid: 'مدفوعة', pending: 'معلقة', cancelled: 'ملغاة' } as Record<string, string>,
}));

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({ data: [] })),
  useContractsByFiscalYear: vi.fn(() => ({ data: [] })),
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

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => ({})),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ remove: vi.fn(), download: vi.fn() }) } },
}));

vi.mock('@/components/invoices/InvoiceViewer', () => ({ default: () => null }));

import InvoicesPage from './InvoicesPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><InvoicesPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('InvoicesPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('إدارة الفواتير')).toBeInTheDocument();
  });

  it('shows upload button', () => {
    renderPage();
    expect(screen.getByText('رفع فاتورة')).toBeInTheDocument();
  });

  it('shows search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('بحث في الفواتير...')).toBeInTheDocument();
  });

  it('shows invoice data in mobile cards', () => {
    renderPage();
    // MobileCardView renders invoice types as titles
    expect(screen.getByText('إيجار')).toBeInTheDocument();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
  });

  it('displays invoice numbers', () => {
    renderPage();
    // MobileCardView shows subtitles with invoice numbers
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('INV-002')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderPage();
    expect(screen.getByText('مدفوعة')).toBeInTheDocument();
    expect(screen.getByText('معلقة')).toBeInTheDocument();
  });

  it('shows view mode toggle buttons', () => {
    renderPage();
    expect(screen.getByText('جدول')).toBeInTheDocument();
    expect(screen.getByText('شبكي')).toBeInTheDocument();
  });

  it('shows amounts in mobile cards', () => {
    renderPage();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });
});
