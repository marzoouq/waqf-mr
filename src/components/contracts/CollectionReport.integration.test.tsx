/**
 * اختبار تكامل: CollectionReport — يعكس تغيّر fiscalYearId على الملخص والفلترة فوراً
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollectionReport from './CollectionReport';
import type { Contract, FiscalYear, PaymentInvoice } from '@/types';

vi.mock('@/hooks/data/contracts/useCollectionAlerts', () => ({
  useCollectionAlerts: () => ({ sendingAlerts: false, sendLatePaymentAlerts: vi.fn() }),
}));
vi.mock('@/hooks/ui/usePrint', () => ({ usePrint: () => vi.fn() }));

const fy: FiscalYear = {
  id: 'fy1', label: '1446-1447', start_date: '2025-01-01', end_date: '2025-12-31',
  status: 'active', published: true, created_at: '2025-01-01',
};

const contract: Contract = {
  id: 'c1', contract_number: 'CON-001', tenant_name: 'أحمد', property_id: 'p1', unit_id: null,
  start_date: '2025-01-01', end_date: '2025-12-31', rent_amount: 12000,
  payment_type: 'monthly', payment_count: 12, payment_amount: 1000,
  status: 'active', fiscal_year_id: 'fy1', notes: null,
  created_at: '2025-01-01', updated_at: '2025-01-01',
  tenant_id_number: null, tenant_id_type: null, tenant_tax_number: null, tenant_crn: null,
  tenant_street: null, tenant_district: null, tenant_city: null, tenant_postal_code: null, tenant_building: null,
};

const mkInv = (o: Partial<PaymentInvoice>): PaymentInvoice => ({
  id: 'i', invoice_number: 'INV', contract_id: 'c1', amount: 1000,
  vat_amount: 0, vat_rate: 0, due_date: '2025-02-01', status: 'pending',
  payment_number: 1, paid_amount: 0, paid_date: null, notes: null, file_path: null,
  fiscal_year_id: 'fy1', zatca_status: '', zatca_uuid: null,
  created_at: '2025-01-01', updated_at: '2025-01-01', ...o,
});

const invoices: PaymentInvoice[] = [
  mkInv({ id: 'old', due_date: '2024-06-01', amount: 500 }),
  mkInv({ id: 'cur', due_date: '2025-03-01', amount: 700 }),
];

describe('CollectionReport (تكامل)', () => {
  it('يُظهر بطاقة تقسيم المتأخرات عند اختيار سنة مالية محددة', () => {
    render(
      <CollectionReport
        contracts={[contract]} paymentInvoices={invoices} isLoading={false}
        fiscalYears={[fy]} fiscalYearId="fy1"
      />,
    );
    expect(screen.getByText('تقسيم المتأخرات حسب السنة المالية')).toBeInTheDocument();
    expect(screen.getByText('من سنوات سابقة')).toBeInTheDocument();
    expect(screen.getByText('هذه السنة')).toBeInTheDocument();
  });

  it('يُخفي بطاقة التقسيم في وضع "جميع السنوات"', () => {
    render(
      <CollectionReport
        contracts={[contract]} paymentInvoices={invoices} isLoading={false}
        fiscalYears={[fy]} fiscalYearId="all"
      />,
    );
    expect(screen.queryByText('تقسيم المتأخرات حسب السنة المالية')).not.toBeInTheDocument();
  });

  it('يعكس تبديل fiscalYearId فوراً (إظهار → إخفاء)', () => {
    const { rerender } = render(
      <CollectionReport
        contracts={[contract]} paymentInvoices={invoices} isLoading={false}
        fiscalYears={[fy]} fiscalYearId="fy1"
      />,
    );
    expect(screen.getByText('تقسيم المتأخرات حسب السنة المالية')).toBeInTheDocument();
    rerender(
      <CollectionReport
        contracts={[contract]} paymentInvoices={invoices} isLoading={false}
        fiscalYears={[fy]} fiscalYearId="all"
      />,
    );
    expect(screen.queryByText('تقسيم المتأخرات حسب السنة المالية')).not.toBeInTheDocument();
  });
});
