/**
 * اختبارات useFiscalYearManagement — حراس الإنشاء/الإقفال/الحذف
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createFy = vi.fn();
const reopenFy = vi.fn();
const togglePub = vi.fn();
const deleteFy = vi.fn();
const navigate = vi.fn();
const notifyError = vi.fn();
const notifySuccess = vi.fn();
const notifyWarning = vi.fn();

vi.mock('@/lib/services', () => ({
  createFiscalYear: (...args: unknown[]) => createFy(...args),
  reopenFiscalYear: (...args: unknown[]) => reopenFy(...args),
  toggleFiscalYearPublished: (...args: unknown[]) => togglePub(...args),
  deleteFiscalYear: (...args: unknown[]) => deleteFy(...args),
}));

vi.mock('@/hooks/data/financial/fiscalYears/useFiscalYears', () => ({
  useFiscalYears: () => ({ data: [], isLoading: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/lib/notify', () => ({
  uiNotify: { success: notifySuccess, error: notifyError, warning: notifyWarning, info: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const loadHook = async () => (await import('./useFiscalYearManagement')).useFiscalYearManagement;

describe('useFiscalYearManagement', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('handleCreate يرفض حقول فارغة', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleCreate(); });
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('جميع الحقول'));
    expect(createFy).not.toHaveBeenCalled();
  });

  it('handleCreate الصحيح ينشئ ويعيد التهيئة', async () => {
    createFy.mockResolvedValue({ id: 'fy-new' });
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    act(() => result.current.setNewFY({ label: '1447-1448', start_date: '2026-07-01', end_date: '2027-06-30' }));
    await act(async () => { await result.current.handleCreate(); });
    await waitFor(() => expect(createFy).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalled();
    expect(result.current.newFY).toEqual({ label: '', start_date: '', end_date: '' });
  });

  it('handleClose يوجه المستخدم لصفحة الحسابات', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleClose({ status: 'active' } as never); });
    expect(notifyWarning).toHaveBeenCalled();
  });

  it('handleClose لا يفعل شيئاً للسنة المقفلة', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleClose({ status: 'closed' } as never); });
    expect(notifyWarning).not.toHaveBeenCalled();
  });

  it('handleDelete يمنع حذف السنة النشطة', async () => {
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleDelete({ id: 'x', status: 'active', label: 'l' } as never); });
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('نشطة'));
    expect(deleteFy).not.toHaveBeenCalled();
  });

  it('handleDelete ينجح للسنة المقفلة', async () => {
    deleteFy.mockResolvedValue(undefined);
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleDelete({ id: 'x', status: 'closed', label: '1445' } as never); });
    expect(deleteFy).toHaveBeenCalledWith('x');
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('handleDelete يترجم خطأ foreign key', async () => {
    deleteFy.mockRejectedValue(new Error('violates foreign key constraint'));
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleDelete({ id: 'x', status: 'closed', label: '1445' } as never); });
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('مرتبطة'));
  });

  it('togglePublished يبدل الحالة ويبلّغ', async () => {
    togglePub.mockResolvedValue(undefined);
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.togglePublished({ id: 'x', published: false, label: '1445' } as never); });
    expect(togglePub).toHaveBeenCalledWith('x', true);
    expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('نشر'));
  });

  it('handleReopen ينجح ويبلّغ', async () => {
    reopenFy.mockResolvedValue({ label: '1445' });
    const h = await loadHook();
    const { result } = renderHook(() => h(), { wrapper });
    await act(async () => { await result.current.handleReopen({ id: 'x' } as never, 'مراجعة'); });
    expect(reopenFy).toHaveBeenCalledWith('x', 'مراجعة');
    expect(notifySuccess).toHaveBeenCalled();
  });
});
