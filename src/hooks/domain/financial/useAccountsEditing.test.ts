/**
 * اختبارات تحرير التحصيل والعقود في صفحة الحسابات — كل الاستدعاءات وهمية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const m = vi.hoisted(() => ({
  updateContract: vi.fn(), deleteContract: vi.fn(), deleteAccount: vi.fn(), upsert: vi.fn(),
  error: vi.fn(), success: vi.fn(),
}));
const mut = (fn: unknown) => ({ mutateAsync: fn, isPending: false });
vi.mock('@/hooks/data/contracts/useContracts', () => ({
  useUpdateContract: () => mut(m.updateContract), useDeleteContract: () => mut(m.deleteContract),
}));
vi.mock('@/hooks/data/financial/accounts/useAccounts', () => ({ useDeleteAccount: () => mut(m.deleteAccount) }));
vi.mock('@/hooks/data/contracts/useTenantPayments', () => ({ useUpsertTenantPayment: () => mut(m.upsert) }));
vi.mock('@/lib/notify', () => ({ uiNotify: { error: m.error, success: m.success } }));

import { useAccountsEditing } from './useAccountsEditing';
import type { Contract } from '@/types';

const contracts = [{ id: 'c1', tenant_name: 'أحمد' }, { id: 'c2', tenant_name: 'خالد' }] as unknown as Contract[];
const collectionData = [
  { tenantName: 'أحمد', paymentPerPeriod: 1000, paidMonths: 12, status: 'مكتمل' },
  { tenantName: 'خالد', paymentPerPeriod: 2000, paidMonths: 1, status: 'متأخر' },
];

const setup = () => renderHook(() => useAccountsEditing({ contracts, collectionData, getExpectedPayments: () => 4 }));

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.updateContract.mockResolvedValue(undefined);
  m.upsert.mockResolvedValue(undefined);
});

describe('useAccountsEditing', () => {
  it('بدء التحرير ينسخ بيانات الصف المختار', () => {
    const { result } = setup();
    act(() => result.current.handleStartEdit(1));
    expect(result.current.editingIndex).toBe(1);
    expect(result.current.editData).toEqual({ contractId: 'c2', tenantName: 'خالد', monthlyRent: 2000, paidMonths: 1, status: 'متأخر' });
  });

  it('الحفظ يحدّث العقد ويسجّل الدفعات المتأخرة الصحيحة ثم يغلق التحرير', async () => {
    const { result } = setup();
    act(() => result.current.handleStartEdit(1));
    await act(async () => { await result.current.handleSaveEdit(); });
    expect(m.updateContract).toHaveBeenCalledWith({ id: 'c2', tenant_name: 'خالد', payment_amount: 2000 });
    expect(m.upsert).toHaveBeenCalledWith({ contract_id: 'c2', paid_months: 1, notes: 'متأخر 3 دفعات' });
    expect(m.success).toHaveBeenCalledWith('تم حفظ بيانات التحصيل');
    expect(result.current.editingIndex).toBeNull();
  });

  it('العقد المكتمل يُحفظ بلا ملاحظة تأخير', async () => {
    const { result } = setup();
    act(() => result.current.handleStartEdit(0));
    await act(async () => { await result.current.handleSaveEdit(); });
    expect(m.upsert).toHaveBeenCalledWith({ contract_id: 'c1', paid_months: 12, notes: '' });
  });

  it('فشل الحفظ يُظهر رسالة عربية ويُبقي التحرير مفتوحاً', async () => {
    m.updateContract.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.handleStartEdit(0));
    await act(async () => { await result.current.handleSaveEdit(); });
    expect(m.error).toHaveBeenCalledWith('خطأ في حفظ بيانات التحصيل');
    expect(m.upsert).not.toHaveBeenCalled();
    expect(result.current.editingIndex).toBe(0);
  });

  it('الحذف يوجَّه للنوع الصحيح فقط', async () => {
    const { result } = setup();
    act(() => result.current.setDeleteTarget({ type: 'account', id: 'a1', name: 'حساب' }));
    await act(async () => { await result.current.handleConfirmDelete(); });
    expect(m.deleteAccount).toHaveBeenCalledWith('a1');
    expect(m.deleteContract).not.toHaveBeenCalled();
    expect(result.current.deleteTarget).toBeNull();
  });
});
