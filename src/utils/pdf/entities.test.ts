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
vi.mock('./core', () => ({
  loadArabicFont: vi.fn().mockResolvedValue(false),
  addHeader: vi.fn().mockResolvedValue(30),
  addHeaderToAllPages: vi.fn(), addFooter: vi.fn(),
  TABLE_HEAD_GREEN: [22, 101, 52], TABLE_HEAD_GOLD: [161, 128, 48],
  baseTableStyles: vi.fn(() => ({})), headStyles: vi.fn(() => ({})), footStyles: vi.fn(() => ({})),
}));

import { generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF } from './entities';

describe('entities PDF', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generatePropertiesPDF saves correctly', async () => {
    await generatePropertiesPDF([{ property_number: 'P-1', property_type: 'تجاري', location: 'الرياض', area: 500 }]);
    expect(mockSave).toHaveBeenCalledWith('properties-report.pdf');
  });

  it('generateContractsPDF saves correctly', async () => {
    await generateContractsPDF([{ contract_number: 'W-001', tenant_name: 'أحمد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 120000, status: 'active' }]);
    expect(mockSave).toHaveBeenCalledWith('contracts-report.pdf');
  });

  it('generateBeneficiariesPDF saves correctly', async () => {
    await generateBeneficiariesPDF([{ name: 'محمد', share_percentage: 60, phone: '0501234567', email: 'a@b.com', bank_account: 'SA1234567890', national_id: '1234567890' }]);
    expect(mockSave).toHaveBeenCalledWith('beneficiaries-report.pdf');
  });

  it('generateUnitsPDF saves correctly', async () => {
    await generateUnitsPDF('P-1', 'الرياض', [
      { unit_number: 'U-1', unit_type: 'محل', status: 'مؤجرة', tenant_name: 'خالد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 5000, paid_months: 6, payment_type: 'monthly', payment_count: 12 },
    ]);
    expect(mockSave).toHaveBeenCalledWith('units-report-P-1.pdf');
  });
});
