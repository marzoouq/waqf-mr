import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { printDistributionReport } from './printDistributionReport';
import { toast } from 'sonner';

describe('printDistributionReport', () => {
  let mockWrite: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockFocus: ReturnType<typeof vi.fn>;
  let mockPrint: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWrite = vi.fn();
    mockClose = vi.fn();
    mockFocus = vi.fn();
    mockPrint = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: mockWrite, close: mockClose },
      focus: mockFocus,
      print: mockPrint,
    } as unknown as Window);
  });

  const baseParams = {
    fiscalYearLabel: '2024-2025',
    availableAmount: 100000,
    distributions: [
      { beneficiary_name: 'محمد', share_percentage: 60, share_amount: 60000, advances_paid: 5000, carryforward_deducted: 0, net_amount: 55000, deficit: 0 },
      { beneficiary_name: 'علي', share_percentage: 40, share_amount: 40000, advances_paid: 0, carryforward_deducted: 0, net_amount: 40000, deficit: 0 },
    ],
  };

  it('opens a new window and writes HTML', () => {
    printDistributionReport(baseParams);
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain('محمد');
    expect(html).toContain('علي');
    expect(html).toContain('2024-2025');
  });

  it('shows toast when popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    printDistributionReport(baseParams);
    expect(toast.error).toHaveBeenCalledWith('يرجى السماح بالنوافذ المنبثقة');
  });

  it('renders deficit rows correctly', () => {
    const params = {
      ...baseParams,
      distributions: [
        { beneficiary_name: 'سعد', share_percentage: 100, share_amount: 100000, advances_paid: 120000, carryforward_deducted: 0, net_amount: 0, deficit: 20000 },
      ],
    };
    printDistributionReport(params);
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain('deficit-row');
    expect(html).toContain('0.00');
  });

  it('includes waqfName and deedNumber when provided', () => {
    printDistributionReport({ ...baseParams, waqfName: 'وقف الثبيتي', deedNumber: 'ص-123' });
    const html = mockWrite.mock.calls[0][0] as string;
    expect(html).toContain('وقف الثبيتي');
    expect(html).toContain('ص-123');
  });
});
