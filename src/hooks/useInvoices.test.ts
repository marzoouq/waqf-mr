import { describe, it, expect, vi } from 'vitest';

vi.mock('./useCrudFactory', () => {
  const mockHook = vi.fn(() => ({ data: [], isLoading: false }));
  const mockMutation = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
  return {
    createCrudFactory: vi.fn((config: any) => {
      expect(config.table).toBe('invoices');
      expect(config.label).toBe('الفاتورة');
      expect(config.select).toContain('property:properties');
      expect(config.select).toContain('contract:contracts');
      return { useList: mockHook, useCreate: mockMutation, useUpdate: mockMutation, useDelete: mockMutation };
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useInvoices, useCreateInvoice, useUpdateInvoice, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, type GenerateInvoicePdfOptions } from './useInvoices';

describe('useInvoices hooks', () => {
  it('exports all CRUD hooks', () => {
    expect(typeof useInvoices).toBe('function');
    expect(typeof useCreateInvoice).toBe('function');
    expect(typeof useUpdateInvoice).toBe('function');
  });

  it('has correct type labels', () => {
    expect(INVOICE_TYPE_LABELS.rent).toBe('إيجار');
    expect(INVOICE_TYPE_LABELS.maintenance).toBe('صيانة ومقاولات');
    expect(INVOICE_TYPE_LABELS.utilities).toBe('خدمات (كهرباء/مياه)');
    expect(INVOICE_TYPE_LABELS.other).toBe('أخرى');
  });

  it('has correct status labels', () => {
    expect(INVOICE_STATUS_LABELS.pending).toBe('معلّقة');
    expect(INVOICE_STATUS_LABELS.paid).toBe('مدفوعة');
    expect(INVOICE_STATUS_LABELS.cancelled).toBe('ملغاة');
  });
});
