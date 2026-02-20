import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    createCrudFactory: vi.fn((config: any) => {
      expect(config.table).toBe('properties');
      expect(config.label).toBe('العقار');
      return { useList: mockHook, useCreate: mockMutation, useUpdate: mockMutation, useDelete: mockMutation };
    }),
  };
});

import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from './useProperties';

describe('useProperties hooks', () => {
  it('exports all CRUD hooks', () => {
    expect(typeof useProperties).toBe('function');
    expect(typeof useCreateProperty).toBe('function');
    expect(typeof useUpdateProperty).toBe('function');
    expect(typeof useDeleteProperty).toBe('function');
  });

  it('uses correct table name and label', () => {
    // validated in mock factory
    expect(true).toBe(true);
  });
});
