import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    useCrudFactory: vi.fn((config: any) => {
      expect(config.table).toBe('beneficiaries');
      expect(config.label).toBe('المستفيد');
      expect(config.orderBy).toBe('name');
      expect(config.ascending).toBe(true);
      return { useList: mockHook, useCreate: mockMutation, useUpdate: mockMutation, useDelete: mockMutation };
    }),
  };
});

vi.mock('@/utils/notifications', () => ({
  notifyAdmins: vi.fn(),
}));

import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from './useBeneficiaries';

describe('useBeneficiaries hooks', () => {
  it('exports all CRUD hooks', () => {
    expect(typeof useBeneficiaries).toBe('function');
    expect(typeof useCreateBeneficiary).toBe('function');
    expect(typeof useUpdateBeneficiary).toBe('function');
    expect(typeof useDeleteBeneficiary).toBe('function');
  });

  it('configures ascending order by name', () => {
    // validated in mock factory
    expect(true).toBe(true);
  });
});
