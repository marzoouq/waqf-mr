import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { printShareReport } from './printShareReport';
import { toast } from 'sonner';

describe('printShareReport', () => {
  let mockWrite: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWrite = vi.fn();
    mockClose = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: mockWrite, close: mockClose },
      focus: vi.fn(),
      print: vi.fn(),
      onload: null,
    } as unknown as Window);
  });

  const baseParams = {
    beneficiaryName: 'أحمد',
    beneficiariesShare: 500000,
    myShare: 100000,
    paidAdvancesTotal: 10000,
    carryforwardBalance: 5000,
    fiscalYearLabel: '2024-2025',
    filteredDistributions: [],
  };

  it('renders beneficiary name and fiscal year', () => {
    printShareReport(baseParams);
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain('أحمد');
    expect(html).toContain('2024-2025');
  });

  it('calculates net correctly (share - advances - carryforward)', () => {
    printShareReport(baseParams);
    const html = mockWrite.mock.calls[0][0] as string;
    // net = 100000 - 10000 - 5000 = 85000
    expect(html).toContain('85,000');
  });

  it('shows deficit when advances exceed share', () => {
    const params = { ...baseParams, paidAdvancesTotal: 120000, carryforwardBalance: 0 };
    printShareReport(params);
    const html = mockWrite.mock.calls[0][0] as string;
    // deficit = |100000 - 120000| = 20000
    expect(html).toContain('فرق مرحّل');
    expect(html).toContain('20,000');
  });

  it('shows toast when popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    printShareReport(baseParams);
    expect(toast.error).toHaveBeenCalled();
  });

  it('renders distributions table when present', () => {
    const params = {
      ...baseParams,
      filteredDistributions: [
        { date: '2024-06-01', amount: 50000, status: 'paid', account: { fiscal_year: '2024-2025' } },
      ],
    };
    printShareReport(params);
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain('سجل التوزيعات');
    expect(html).toContain('مستلم');
  });
});
