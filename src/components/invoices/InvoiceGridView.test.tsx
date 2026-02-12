import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InvoiceGridView from './InvoiceGridView';
import { Invoice } from '@/hooks/useInvoices';

// Mock InvoiceViewer
vi.mock('@/components/invoices/InvoiceViewer', () => ({
  default: ({ open, filePath, fileName }: any) =>
    open ? <div data-testid="invoice-viewer">{fileName} - {filePath}</div> : null,
}));

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: '1',
  invoice_number: '001',
  invoice_type: 'rent',
  amount: 5000,
  date: '2024-01-15',
  property_id: 'p1',
  contract_id: null,
  expense_id: null,
  description: null,
  file_path: null,
  file_name: null,
  status: 'paid',
  fiscal_year_id: null,
  created_at: '',
  updated_at: '',
  property: { id: 'p1', property_number: '101', location: 'الرياض' },
  contract: null,
  ...overrides,
});

describe('InvoiceGridView', () => {
  it('renders empty state when no invoices', () => {
    render(<InvoiceGridView invoices={[]} />);
    expect(screen.getByText('لا توجد فواتير')).toBeInTheDocument();
  });

  it('renders invoice cards with correct data', () => {
    const invoices = [makeInvoice()];
    render(<InvoiceGridView invoices={invoices} />);
    expect(screen.getByText('إيجار')).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('عقار: 101')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<InvoiceGridView invoices={[makeInvoice({ status: 'paid' })]} />);
    expect(screen.getByText('مدفوعة')).toBeInTheDocument();
  });

  it('shows document icon for non-image files', () => {
    render(<InvoiceGridView invoices={[makeInvoice({ file_path: 'doc.pdf', file_name: 'فاتورة.pdf' })]} />);
    expect(screen.getByText('📎 فاتورة.pdf')).toBeInTheDocument();
  });

  it('renders image thumbnail for image files', () => {
    render(<InvoiceGridView invoices={[makeInvoice({ file_path: 'img.jpg', file_name: 'photo.jpg' })]} />);
    const img = screen.getByRole('img', { name: 'photo.jpg' });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('img.jpg');
  });

  it('opens InvoiceViewer when view button is clicked', () => {
    render(<InvoiceGridView invoices={[makeInvoice({ file_path: 'test.pdf', file_name: 'test.pdf' })]} />);
    const viewBtn = screen.getByText('عرض');
    fireEvent.click(viewBtn);
    expect(screen.getByTestId('invoice-viewer')).toBeInTheDocument();
  });

  it('calls onEdit when card is clicked in non-readOnly mode', () => {
    const onEdit = vi.fn();
    const inv = makeInvoice();
    const { container } = render(<InvoiceGridView invoices={[inv]} onEdit={onEdit} />);
    const card = container.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(card!);
    expect(onEdit).toHaveBeenCalledWith(inv);
  });

  it('does not call onEdit when readOnly', () => {
    const onEdit = vi.fn();
    render(<InvoiceGridView invoices={[makeInvoice()]} onEdit={onEdit} readOnly />);
    fireEvent.click(screen.getByText('إيجار'));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('renders multiple invoices', () => {
    const invoices = [
      makeInvoice({ id: '1', invoice_number: '001', amount: 1000 }),
      makeInvoice({ id: '2', invoice_number: '002', amount: 2000 }),
    ];
    render(<InvoiceGridView invoices={invoices} />);
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('#002')).toBeInTheDocument();
  });
});
