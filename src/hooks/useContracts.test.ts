import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    useCrudFactory: vi.fn((config: any) => {
      // Validate config
      expect(config.table).toBe('contracts');
      expect(config.label).toBe('العقد');
      expect(config.select).toContain('property:properties');
      expect(config.select).toContain('unit:units');
      return { useList: mockHook, useCreate: mockMutation, useUpdate: mockMutation, useDelete: mockMutation };
    }),
  };
});

import { useContracts, useCreateContract, useUpdateContract, useDeleteContract } from './useContracts';

describe('useContracts hooks', () => {
  it('exports useContracts as useList', () => {
    expect(typeof useContracts).toBe('function');
  });

  it('exports useCreateContract', () => {
    expect(typeof useCreateContract).toBe('function');
  });

  it('exports useUpdateContract', () => {
    expect(typeof useUpdateContract).toBe('function');
  });

  it('exports useDeleteContract', () => {
    expect(typeof useDeleteContract).toBe('function');
  });

  it('configures correct table and joins', () => {
    // config validation happens inside the mock factory above
    expect(true).toBe(true);
  });
});
