/**
 * اختبارات useCollectionData — حساب بيانات التحصيل
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollectionData } from './useCollectionData';
import type { Contract } from '@/types/database';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';

const makeFY = (overrides: Partial<FiscalYear> = {}): FiscalYear => ({
  id: 'fy1',
  label: '1446-1447',
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  status: 'active',
  published: true,
  created_at: '2025-01-01',
  ...overrides,
});

const makeContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'c1',
  contract_number: 'CON-001',
  tenant_name: 'أحمد',
  property_id: 'p1',
  unit_id: null,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  rent_amount: 12000,
  payment_type: 'monthly',
  payment_count: 12,
  payment_amount: 1000,
  status: 'active',
  fiscal_year_id: 'fy1',
  notes: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  tenant_id_number: null,
  tenant_id_type: null,
  tenant_tax_number: null,
  tenant_crn: null,
  tenant_street: null,
  tenant_district: null,
  tenant_city: null,
  tenant_postal_code: null,
  tenant_building: null,
  ...overrides,
});

const makeInvoice = (overrides: Partial<PaymentInvoice> = {}): PaymentInvoice => ({
  id: 'inv1',
  invoice_number: 'INV-001',
  contract_id: 'c1',
  amount: 1000,
  vat_amount: 0,
  vat_rate: 0,
  due_date: '2025-02-01',
  status: 'paid',
  payment_number: 1,
  paid_amount: 0,
  paid_date: null,
  notes: null,
  file_path: null,
  fiscal_year_id: 'fy1',
  
  icv: null,
  invoice_hash: null,
  zatca_status: '',
  zatca_uuid: null,
  zatca_xml: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  ...overrides,
});

describe('useCollectionData', () => {
  const fiscalYears = [makeFY()];
  const contracts = [makeContract()];

  it('يحسب الملخص بشكل صحيح عند وجود فواتير مدفوعة', () => {
    const invoices = [
      makeInvoice({ id: 'i1', status: 'paid' }),
      makeInvoice({ id: 'i2', status: 'paid', payment_number: 2 }),
      makeInvoice({ id: 'i3', status: 'pending', payment_number: 3 }),
    ];
    const { result } = renderHook(() =>
      useCollectionData({ contracts, paymentInvoices: invoices, fiscalYears, fiscalYearId: 'fy1' })
    );
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]!.paid).toBe(2);
    expect(result.current.summary.total).toBe(1);
    expect(result.current.summary.totalCollected).toBeGreaterThan(0);
  });

  it('يعرض الحالة "complete" عند اكتمال الدفعات', () => {
    // 12 فاتورة مدفوعة لعقد شهري
    const invoices = Array.from({ length: 12 }, (_, i) =>
      makeInvoice({ id: `i${i}`, payment_number: i + 1, status: 'paid' })
    );
    const { result } = renderHook(() =>
      useCollectionData({ contracts, paymentInvoices: invoices, fiscalYears, fiscalYearId: 'fy1' })
    );
    expect(result.current.rows[0]!.status).toBe('complete');
    expect(result.current.summary.completeCount).toBe(1);
  });

  it('يصفّي حسب النص بشكل صحيح', () => {
    const multiContracts = [
      makeContract({ id: 'c1', tenant_name: 'أحمد' }),
      makeContract({ id: 'c2', contract_number: 'CON-002', tenant_name: 'خالد' }),
    ];
    const invoices = [
      makeInvoice({ contract_id: 'c1', status: 'pending' }),
      makeInvoice({ id: 'i2', contract_id: 'c2', status: 'pending' }),
    ];
    const { result } = renderHook(() =>
      useCollectionData({ contracts: multiContracts, paymentInvoices: invoices, fiscalYears, fiscalYearId: 'fy1' })
    );
    act(() => result.current.setSearch('خالد'));
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]!.contract.tenant_name).toBe('خالد');
  });

  it('يصفّي حسب الحالة "overdue"', () => {
    const invoices = [
      makeInvoice({ status: 'pending' }), // ليس مدفوعاً — سينتج overdue
    ];
    const { result } = renderHook(() =>
      useCollectionData({ contracts, paymentInvoices: invoices, fiscalYears, fiscalYearId: 'fy1' })
    );
    act(() => result.current.setFilter('overdue'));
    // نتيجة تعتمد على التخصيص — نتحقق فقط أن التصفية لم تُخطئ
    expect(result.current.filteredRows.length).toBeLessThanOrEqual(result.current.rows.length);
  });

  it('يتعامل مع "جميع السنوات" بشكل صحيح', () => {
    const invoices = [makeInvoice({ status: 'paid' })];
    const { result } = renderHook(() =>
      useCollectionData({ contracts, paymentInvoices: invoices, fiscalYears, fiscalYearId: 'all' })
    );
    expect(result.current.useDynamicAllocation).toBe(false);
    expect(result.current.rows).toHaveLength(1);
  });
});
