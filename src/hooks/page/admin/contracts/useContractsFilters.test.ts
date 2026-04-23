/**
 * اختبارات useContractsFilters — تصفية وتجميع العقود
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContractsFilters } from './useContractsFilters';
import type { Contract } from '@/types';

// عقود وهمية
const makeContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'c1',
  contract_number: 'CON-001',
  tenant_name: 'أحمد محمد',
  property_id: 'p1',
  unit_id: null,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  rent_amount: 50000,
  payment_type: 'annual',
  payment_count: 1,
  payment_amount: null,
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

const contracts: Contract[] = [
  makeContract({ id: 'c1', contract_number: 'CON-001', tenant_name: 'أحمد', status: 'active', property_id: 'p1', payment_type: 'annual' }),
  makeContract({ id: 'c2', contract_number: 'CON-001-R1', tenant_name: 'أحمد', status: 'expired', property_id: 'p1', payment_type: 'annual', start_date: '2024-01-01', end_date: '2024-12-31' }),
  makeContract({ id: 'c3', contract_number: 'CON-002', tenant_name: 'خالد', status: 'active', property_id: 'p2', payment_type: 'monthly' }),
  makeContract({ id: 'c4', contract_number: 'CON-003', tenant_name: 'فهد', status: 'cancelled', property_id: 'p1', payment_type: 'quarterly' }),
];

const overdueContractIds = new Set(['c3']);

describe('useContractsFilters', () => {
  const setup = () =>
    renderHook(() => useContractsFilters({ contracts, overdueContractIds }));

  it('يجمع العقود حسب الرقم الأساسي', () => {
    const { result } = setup();
    // CON-001 و CON-001-R1 في مجموعة واحدة، CON-002 و CON-003 منفصلتان
    expect(result.current.groupedContracts).toHaveLength(3);
  });

  it('يحسب عدد الحالات بشكل صحيح', () => {
    const { result } = setup();
    expect(result.current.statusCounts.all).toBe(3);
    expect(result.current.statusCounts.active).toBe(2); // CON-001 group + CON-002
    expect(result.current.statusCounts.cancelled).toBe(1); // CON-003
  });

  it('يعرض كل المجموعات عند عدم وجود فلتر', () => {
    const { result } = setup();
    expect(result.current.filteredGroups).toHaveLength(3);
  });

  it('يصفّي حسب الحالة "active"', () => {
    const { result } = setup();
    act(() => result.current.setStatusFilter('active'));
    expect(result.current.filteredGroups.every(([, group]) => group[0]!.status === 'active')).toBe(true);
  });

  it('يصفّي حسب المتأخرة "overdue"', () => {
    const { result } = setup();
    act(() => result.current.setStatusFilter('overdue'));
    // فقط المجموعة التي تحتوي على c3
    expect(result.current.filteredGroups).toHaveLength(1);
    expect(result.current.filteredGroups[0]![1].some(c => c.id === 'c3')).toBe(true);
  });

  it('يصفّي حسب العقار', () => {
    const { result } = setup();
    act(() => result.current.setPropertyFilter('p2'));
    expect(result.current.filteredGroups).toHaveLength(1);
  });

  it('يصفّي حسب نوع الدفع', () => {
    const { result } = setup();
    act(() => result.current.setPaymentTypeFilter('monthly'));
    expect(result.current.filteredGroups).toHaveLength(1);
  });

  it('يبحث في اسم المستأجر', () => {
    const { result } = setup();
    act(() => result.current.setSearchQuery('خالد'));
    expect(result.current.filteredGroups).toHaveLength(1);
  });

  it('يبحث في رقم العقد', () => {
    const { result } = setup();
    act(() => result.current.setSearchQuery('CON-003'));
    expect(result.current.filteredGroups).toHaveLength(1);
  });

  it('يُبدّل توسيع/طي جميع المجموعات', () => {
    const { result } = setup();
    expect(result.current.allExpanded).toBe(false);
    act(() => result.current.toggleAllGroups());
    expect(result.current.allExpanded).toBe(true);
    act(() => result.current.toggleAllGroups());
    expect(result.current.allExpanded).toBe(false);
  });

  it('يجمع فلاتر متعددة معاً', () => {
    const { result } = setup();
    act(() => {
      result.current.setStatusFilter('active');
      result.current.setPropertyFilter('p2');
    });
    // فقط CON-002 (نشط + عقار p2)
    expect(result.current.filteredGroups).toHaveLength(1);
  });
});
