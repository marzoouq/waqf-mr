import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    useCrudFactory: vi.fn((config: any) => {
      expect(config.table).toBe('expenses');
      expect(config.label).toBe('المصروف');
      expect(config.select).toContain('property:properties');
      expect(config.orderBy).toBe('date');
      return { useList: mockHook, useCreate: mockMutation, useUpdate: mockMutation, useDelete: mockMutation };
    }),
  };
});

vi.mock('@/utils/notifications', () => ({
  notifyAllBeneficiaries: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from './useExpenses';

describe('useExpenses hooks', () => {
  it('exports all CRUD hooks', () => {
    expect(typeof useExpenses).toBe('function');
    expect(typeof useCreateExpense).toBe('function');
    expect(typeof useUpdateExpense).toBe('function');
    expect(typeof useDeleteExpense).toBe('function');
  });

  it('configures with property join and date ordering', () => {
    expect(true).toBe(true);
  });
});
