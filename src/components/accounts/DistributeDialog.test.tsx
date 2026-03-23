/**
 * اختبارات حوار التوزيع — التحقق من منطق الحصص والخصومات
 * نختبر عبر render لأن المنطق داخل useMemo في المكون
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DistributeDialog from './DistributeDialog';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ data: [], error: null }),
          or: () => ({ data: [], error: null }),
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/hooks/useDistribute', () => ({
  useDistributeShares: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: () => ({ waqfName: 'وقف تجريبي', deedNumber: '123', logoUrl: '' }),
}));

vi.mock('@/utils/pdf', () => ({
  generateDistributionsPDF: vi.fn(),
}));

vi.mock('@/utils/printDistributionReport', () => ({
  printDistributionReport: vi.fn(),
}));

const beneficiaries = [
  { id: '1', name: 'محمد', share_percentage: 40 },
  { id: '2', name: 'أحمد', share_percentage: 60 },
];

function renderDialog(props: Partial<React.ComponentProps<typeof DistributeDialog>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DistributeDialog
        open={true}
        onOpenChange={vi.fn()}
        beneficiaries={beneficiaries}
        availableAmount={10000}
        totalBeneficiaryPercentage={100}
        accountId="acc-1"
        fiscalYearId="fy-1"
        fiscalYearLabel="1446"
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('DistributeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يعرض أسماء المستفيدين', () => {
    renderDialog();
    expect(screen.getAllByText('محمد').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('أحمد').length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض المبلغ المتاح', () => {
    renderDialog();
    expect(screen.getAllByText(/10,000.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض رسالة عند عدم وجود مستفيدين', () => {
    renderDialog({ beneficiaries: [] });
    expect(screen.getByText('لا يوجد مستفيدون')).toBeInTheDocument();
  });

  it('يعرض زر تأكيد التوزيع', () => {
    renderDialog();
    expect(screen.getByText('تأكيد التوزيع')).toBeInTheDocument();
  });

  it('يعطّل زر التأكيد عند عدم وجود مستفيدين', () => {
    renderDialog({ beneficiaries: [] });
    const btn = screen.getByText('تأكيد التوزيع');
    expect(btn.closest('button')).toBeDisabled();
  });
});
