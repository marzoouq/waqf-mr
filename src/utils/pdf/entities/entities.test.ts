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
vi.mock('@/utils/maskData', () => ({ maskBankAccount: (v: string) => '***' + v.slice(-4), maskNationalId: (v: string) => '***' + v.slice(-4) }));
vi.mock('../core/core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(), addFooter: vi.fn(),
  createPdfDocument: vi.fn().mockImplementation(async () => {  const { default: JsPDF } = await import('jspdf'); return { doc: new JsPDF(), fontFamily: 'Amiri', startY: 40 }; }),
  finalizePdf: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_GOLD: [161, 128, 48],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
  reshapeArabic: (t: string) => t, reshapeRow: (r: unknown[]) => r,
  fmtDate: (d: string) => d,
}));

import { generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF } from '../entities/entities';

describe('entities PDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prints effective expiry without mutating the recorded contract or rent', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T11:50:00Z'));
    const contract = { contract_number: 'W-001', tenant_name: 'أحمد', start_date: '2025-01-01', end_date: '2026-01-01', rent_amount: 1778800, status: 'active' };
    try {
      await generateContractsPDF([contract]);
      const { default: table } = await import('jspdf-autotable');
      const output = JSON.stringify(vi.mocked(table).mock.calls);
      expect(output).toContain('منتهي');
      expect(output).toContain('1,778,800');
      expect(contract.status).toBe('active');
      expect(contract.rent_amount).toBe(1778800);
    } finally { vi.useRealTimers(); }
  });

  it('generatePropertiesPDF saves correctly', async () => {
    await generatePropertiesPDF([{ property_number: 'P-1', property_type: 'تجاري', location: 'الرياض', area: 500 }]);
    expect(vi.mocked((await import('../core/core')).finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked((await import('../core/core')).finalizePdf).mock.calls[0]?.[2]).toBe('properties-report.pdf');
  });

  it('exports property operating figures unchanged, not recalculated', async () => {
    await generatePropertiesPDF([{ property_number: 'P-1', property_type: 'تجاري', location: 'الرياض', area: 500,
      financials: { totalUnits: 19, occupancy: 79, contractualRevenue: 1778800, totalExpenses: 127984.44, netIncome: 1650815.56 } }]);
    const { default: table } = await import('jspdf-autotable');
    const output = JSON.stringify(vi.mocked(table).mock.calls);
    expect(output).toContain('1,778,800');
    expect(output).toContain('127,984.44');
    expect(output).toContain('1,650,815.56');
  });

  it('keeps historical unit occupancy while printing actual contract expiry', async () => {
    await generateUnitsPDF('P-1', 'الرياض', [{ unit_number: '1', unit_type: 'شقة', status: 'مؤجرة', contract_status: 'active', tenant_name: 'أحمد', start_date: '2025-01-01', end_date: '2026-01-01', rent_amount: 12000, paid_months: 12 }]);
    const { default: table } = await import('jspdf-autotable');
    const body = vi.mocked(table).mock.calls[0]?.[1]?.body;
    expect(JSON.stringify(body)).toContain('مؤجرة');
    expect(JSON.stringify(body)).toContain('منتهي');
  });

  it('generateContractsPDF saves correctly', async () => {
    await generateContractsPDF([{ contract_number: 'W-001', tenant_name: 'أحمد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 120000, status: 'active' }]);
    expect(vi.mocked((await import('../core/core')).finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked((await import('../core/core')).finalizePdf).mock.calls[0]?.[2]).toBe('contracts-report.pdf');
  });

  it('generateBeneficiariesPDF saves correctly', async () => {
    await generateBeneficiariesPDF([{ name: 'محمد', share_percentage: 60, phone: '0501234567', email: 'a@b.com', bank_account: 'SA1234567890', national_id: '1234567890' }]);
    expect(vi.mocked((await import('../core/core')).finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked((await import('../core/core')).finalizePdf).mock.calls[0]?.[2]).toBe('beneficiaries-report.pdf');
  });

  it('generateUnitsPDF saves correctly', async () => {
    await generateUnitsPDF('P-1', 'الرياض', [
      { unit_number: 'U-1', unit_type: 'محل', status: 'مؤجرة', tenant_name: 'خالد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 5000, paid_months: 6, payment_type: 'monthly', payment_count: 12 },
    ]);
    expect(vi.mocked((await import("../core/core")).finalizePdf)).toHaveBeenCalled();
    expect(vi.mocked((await import("../core/core")).finalizePdf).mock.calls[0]?.[2]).toMatch(/^units-report/);
  });
});
