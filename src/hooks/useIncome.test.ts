import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    createCrudFactory: vi.fn((config: any) => {
      expect(config.table).toBe('income');
      expect(config.label).toBe('الدخل');
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

import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome } from './useIncome';

describe('useIncome hooks', () => {
  it('exports all CRUD hooks', () => {
    expect(typeof useIncome).toBe('function');
    expect(typeof useCreateIncome).toBe('function');
    expect(typeof useUpdateIncome).toBe('function');
    expect(typeof useDeleteIncome).toBe('function');
  });

  it('configures with property join and date ordering', () => {
    // validated in mock factory
    expect(true).toBe(true);
  });
});
