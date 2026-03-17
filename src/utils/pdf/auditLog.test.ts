import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return {
      text: vi.fn(), save: mockSave, setFont: vi.fn(), setFontSize: vi.fn(),
      internal: { pageSize: { width: 297, height: 210 }, pages: ['', ''] },
      getNumberOfPages: vi.fn(() => 1), setPage: vi.fn(),
    };
  },
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(), addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
}));
vi.mock('@/hooks/useAuditLog', () => ({
  getTableNameAr: vi.fn((t: string) => t === 'contracts' ? 'العقود' : t),
  getOperationNameAr: vi.fn((o: string) => o === 'INSERT' ? 'إضافة' : o),
}));

import { generateAuditLogPDF } from './auditLog';

describe('generateAuditLogPDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves audit log PDF', async () => {
    await generateAuditLogPDF({
      logs: [
        { id: '1', table_name: 'contracts', operation: 'INSERT', created_at: '2024-01-15T10:00:00Z', record_id: 'r1', user_id: 'u1', old_data: null, new_data: { tenant_name: 'أحمد' } },
      ],
    });
    expect(mockSave).toHaveBeenCalledWith('تقرير-سجل-المراجعة.pdf');
  });

  it('handles REOPEN operation with reason', async () => {
    await generateAuditLogPDF({
      logs: [
        { id: '2', table_name: 'fiscal_years', operation: 'REOPEN', created_at: '2024-06-01T10:00:00Z', record_id: 'fy1', user_id: 'u1', old_data: null, new_data: { reason: 'تصحيح خطأ' } },
      ],
    });
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles UPDATE with changed fields', async () => {
    await generateAuditLogPDF({
      logs: [
        { id: '3', table_name: 'contracts', operation: 'UPDATE', created_at: '2024-03-01T10:00:00Z', record_id: 'c1', user_id: 'u1', old_data: { rent_amount: 100000 }, new_data: { rent_amount: 120000 } },
      ],
    });
    expect(mockSave).toHaveBeenCalled();
  });
});
