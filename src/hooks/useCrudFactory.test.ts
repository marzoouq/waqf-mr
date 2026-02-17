import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Supabase mock ----
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useCrudFactory } from './useCrudFactory';
import { toast } from 'sonner';

// ---- helpers ----
function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const sampleRows = [
  { id: '1', property_number: 'W-001', location: 'A', area: 100, property_type: 'مبنى', created_at: '', updated_at: '', description: null },
  { id: '2', property_number: 'W-002', location: 'B', area: 200, property_type: 'أرض', created_at: '', updated_at: '', description: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Default chain for select queries
  mockSelect.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue({ data: sampleRows, error: null });
  // Default chain for insert
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: sampleRows[0], error: null });
  // Default chain for update
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  // Default chain for delete
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
});

describe('useCrudFactory', () => {
  const factory = useCrudFactory({ table: 'properties', queryKey: 'test-props', label: 'العقار' });

  describe('useList', () => {
    it('returns data on success', async () => {
      const { result } = renderHook(() => factory.useList(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(sampleRows);
    });

    it('throws on supabase error', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
      const { result } = renderHook(() => factory.useList(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreate', () => {
    it('shows success toast on create', async () => {
      const { result } = renderHook(() => factory.useCreate(), { wrapper: wrapper() });
      await result.current.mutateAsync({ property_number: 'W-003', location: 'C', area: 300, property_type: 'فيلا' } as any);
      expect(toast.success).toHaveBeenCalledWith('تم إضافة العقار بنجاح');
    });

    it('shows error toast on failure', async () => {
      mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } }) }) });
      const { result } = renderHook(() => factory.useCreate(), { wrapper: wrapper() });
      await expect(result.current.mutateAsync({} as any)).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('حدث خطأ أثناء إضافة العقار');
    });
  });

  describe('useDelete', () => {
    it('shows success toast on delete', async () => {
      const { result } = renderHook(() => factory.useDelete(), { wrapper: wrapper() });
      await result.current.mutateAsync('1');
      expect(toast.success).toHaveBeenCalledWith('تم حذف العقار بنجاح');
    });
  });

  describe('config defaults', () => {
    it('uses default orderBy=created_at, ascending=false, limit=500', async () => {
      const { result } = renderHook(() => factory.useList(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(500);
    });

    it('respects custom config', async () => {
      const custom = useCrudFactory({ table: 'units', queryKey: 'test-units', label: 'الوحدة', orderBy: 'unit_number', ascending: true, limit: 100 });
      const { result } = renderHook(() => custom.useList(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockOrder).toHaveBeenCalledWith('unit_number', { ascending: true });
      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });

  describe('callbacks', () => {
    it('calls onCreateSuccess callback', async () => {
      const onCreateSuccess = vi.fn();
      const withCb = useCrudFactory({ table: 'properties', queryKey: 'cb-test', label: 'العقار', onCreateSuccess });
      const { result } = renderHook(() => withCb.useCreate(), { wrapper: wrapper() });
      await result.current.mutateAsync({} as any);
      expect(onCreateSuccess).toHaveBeenCalledWith(sampleRows[0]);
    });
  });
});
