import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const mockUseMyShare = vi.fn(() => ({
  currentBeneficiary: { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 },
  myShare: 100000,
  totalBenPct: 10,
  pctLoading: false,
}));

const mockUseFiscalYear = vi.fn(() => ({
  fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
  fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
  fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
  isClosed: false, isLoading: false, noPublishedYears: false,
}));

const mockUseCarryforwardBalance = vi.fn(() => ({ data: 0 }));
const mockUseMySharePage = vi.fn();

const baseMySharePageState = {
  isLoading: false,
  isError: false,
  handleRetry: vi.fn(),
  currentBeneficiary: { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 },
  isAccountMissing: false,
  isClosed: false,
  myShare: 100000,
  totalReceived: 0,
  pendingAmount: 0,
  paidAdvancesTotal: 0,
  carryforwardBalance: 0,
  filteredDistributions: [],
  myAdvances: [],
  myCarryforwards: [],
  advancesEnabled: true,
  advanceSettings: { enabled: true, min_amount: 500, max_percentage: 50 },
  fiscalYearId: 'fy1',
  selectedFY: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
  handleDownloadPDF: vi.fn(),
  handleDownloadDistributionsPDF: vi.fn(),
  handleDownloadComprehensivePDF: vi.fn(),
  handlePrintReport: vi.fn(),
  navigate: vi.fn(),
};

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/financial/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => mockUseFiscalYear(),
  FiscalYearProvider: ({ children }: { children: React.ReactNode }) => children,
}));


vi.mock('@/hooks/financial/useMyShare', () => ({
  useMyShare: () => mockUseMyShare(),
}));

vi.mock('@/hooks/financial/useAdvanceRequests', () => ({
  useMyBeneficiaryFinance: vi.fn(() => ({ data: { myAdvances: [], myCarryforwards: [], paidAdvancesTotal: 0, carryforwardBalance: 0 } })),
  useMyAdvanceRequests: vi.fn(() => ({ data: [] })),
  usePaidAdvancesTotal: vi.fn(() => ({ data: 0 })),
  useCarryforwardBalance: () => mockUseCarryforwardBalance(),
  useMyCarryforwards: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/data/useContracts', () => ({
  useContractsByFiscalYear: vi.fn(() => ({ data: [] })),
  useContractsSafeByFiscalYear: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/data/usePdfWaqfInfo', () => ({ usePdfWaqfInfo: vi.fn(() => ({})) }));
vi.mock('@/hooks/data/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({ getJsonSetting: vi.fn((_k: string, d: unknown) => d), isLoading: false })),
}));
vi.mock('@/hooks/financial/useTotalBeneficiaryPercentage', () => ({
  useTotalBeneficiaryPercentage: vi.fn(() => ({ data: 10, isLoading: false })),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/common/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/components/common/NoPublishedYearsNotice', () => ({ default: () => <div>no years</div> }));
vi.mock('@/components/RequirePublishedYears', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/layout/PageHeaderCard', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('@/utils/pdf', () => ({ generateMySharePDF: vi.fn(), generateDistributionsPDF: vi.fn(), generateComprehensiveBeneficiaryPDF: vi.fn() }));
vi.mock('@/utils/printShareReport', () => ({ printShareReport: vi.fn() }));
vi.mock('@/components/admin/beneficiaries/AdvanceRequestDialog', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
}));

vi.mock('@/hooks/page/beneficiary/useMySharePage', () => ({
  useMySharePage: () => mockUseMySharePage(),
}));

import MySharePage from './MySharePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MySharePage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MySharePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMySharePage.mockReturnValue({ ...baseMySharePageState });
    mockUseMyShare.mockReturnValue({
      currentBeneficiary: { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10 },
      myShare: 100000, totalBenPct: 10, pctLoading: false,
    });
    mockUseFiscalYear.mockReturnValue({
      fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
      fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
      fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
      isClosed: false, isLoading: false, noPublishedYears: false,
    });
    mockUseCarryforwardBalance.mockReturnValue({ data: 0 });
  });

  it('renders page title', async () => {
    renderPage();
    expect(await screen.findByText('حصتي من الريع')).toBeInTheDocument();
  });

  it('shows distributions history section', async () => {
    renderPage();
    expect(await screen.findByText('سجل التوزيعات')).toBeInTheDocument();
  });

  it('shows empty distributions message', async () => {
    renderPage();
    expect(await screen.findByText('لا توجد توزيعات مسجلة بعد')).toBeInTheDocument();
  });

  it('shows link to disclosure page', async () => {
    renderPage();
    expect(await screen.findByText('صفحة الإفصاح السنوي')).toBeInTheDocument();
  });

  // ─── اختبارات جديدة ───

  it('يعرض زر إعادة المحاولة عند حدوث خطأ', async () => {
    mockUseMySharePage.mockReturnValue({
      ...baseMySharePageState,
      isError: true,
    });
    renderPage();
    expect(await screen.findByText('إعادة المحاولة')).toBeInTheDocument();
    expect(screen.getByText('حدث خطأ أثناء تحميل البيانات')).toBeInTheDocument();
  });

  it('يعرض رسالة عدم العثور على المستفيد', async () => {
    mockUseMySharePage.mockReturnValue({
      ...baseMySharePageState,
      currentBeneficiary: null,
    });
    renderPage();
    expect(await screen.findByText('لم يتم العثور على سجل المستفيد')).toBeInTheDocument();
  });

  it('يعرض تنبيه السنة المالية النشطة', async () => {
    renderPage();
    expect(await screen.findByText('السنة المالية لم تُغلق بعد')).toBeInTheDocument();
  });

  it('لا يعرض تنبيه السنة المالية عند الإقفال', async () => {
    mockUseMySharePage.mockReturnValue({
      ...baseMySharePageState,
      isClosed: true,
      selectedFY: { id: 'fy1', label: '1446-1447', status: 'closed', start_date: '2024-01-01', end_date: '2025-01-01' },
    });
    renderPage();
    // يجب أن يظهر العنوان لكن لا تظهر رسالة التنبيه
    expect(await screen.findByText('حصتي من الريع')).toBeInTheDocument();
    expect(screen.queryByText('السنة المالية لم تُغلق بعد')).not.toBeInTheDocument();
  });

  it('يعرض تنبيه الفروق المرحّلة عند وجود رصيد', async () => {
    mockUseMySharePage.mockReturnValue({
      ...baseMySharePageState,
      carryforwardBalance: 5000,
    });
    renderPage();
    expect(await screen.findByText('فروق مرحّلة من سنوات سابقة')).toBeInTheDocument();
  });
});
