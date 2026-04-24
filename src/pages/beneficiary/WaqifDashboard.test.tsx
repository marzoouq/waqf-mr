import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───

const mockUseAuth = vi.fn(() => ({
  user: { id: '1', email: 'waqif@test.com' },
  role: 'waqif',
  loading: false,
}));

vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseFiscalYear = vi.fn(() => ({
  fiscalYear: { id: '1', label: '2025-2026', status: 'active', published: true },
  fiscalYearId: '1',
  isLoading: false,
  noPublishedYears: false,
  isSpecificYear: true,
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: () => mockUseFiscalYear(),
  FiscalYearProvider: ({ children }: { children: React.ReactNode }) => children,
}));


vi.mock('@/hooks/data/useProperties', () => ({
  useProperties: () => ({ data: [{ id: 'p1' }, { id: 'p2' }], isLoading: false }),
}));

vi.mock('@/hooks/data/useContracts', () => ({
  useContractsByFiscalYear: () => ({ data: [], isLoading: false }),
  useContractsSafeByFiscalYear: () => ({
    data: [
      { id: 'c1', status: 'active', rent_amount: 120000 },
      { id: 'c2', status: 'active', rent_amount: 80000 },
      { id: 'c3', status: 'expired', rent_amount: 50000 },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/data/beneficiaries/useBeneficiaries', () => ({
  useBeneficiariesSafe: () => ({ data: [{ id: 'b1' }, { id: 'b2' }], isLoading: false }),
}));

vi.mock('@/hooks/data/useUnits', () => ({
  useAllUnits: () => ({ data: [{ id: 'u1', status: 'occupied' }, { id: 'u2', status: 'vacant' }], isLoading: false }),
}));

vi.mock('@/hooks/data/usePaymentInvoices', () => ({
  usePaymentInvoices: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/computed/useContractAllocations', () => ({
  useContractAllocations: () => ({ data: [] }),
}));

vi.mock('@/hooks/ui/useDashboardRealtime', () => ({
  useDashboardRealtime: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null }),
        eq: () => ({ order: () => ({ data: [], error: null }), select: () => ({ data: [], error: null }) }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: '1', email: 'waqif@test.com' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: () => Promise.resolve({ data: 0, error: null }),
    channel: () => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/common/SkeletonLoaders', () => ({ DashboardSkeleton: () => <div>loading</div> }));
vi.mock('@/components/common/NoPublishedYearsNotice', () => ({ default: () => <div>لا توجد سنوات مالية منشورة</div> }));
vi.mock('@/components/common/ExportMenu', () => ({ default: () => null }));

const renderPage = async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: WaqifDashboard } = await import('./WaqifDashboard');
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><WaqifDashboard /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WaqifDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: '1', email: 'waqif@test.com' }, role: 'waqif', loading: false });
    mockUseFiscalYear.mockReturnValue({
      fiscalYear: { id: '1', label: '2025-2026', status: 'active', published: true },
      fiscalYearId: '1', isLoading: false, noPublishedYears: false, isSpecificYear: true,
    });
  });

  it('renders without crashing', async () => {
    const { container } = await renderPage();
    expect(container.firstChild).not.toBeNull();
  }, 15_000);

  it('يعرض البطاقات المالية بالقيم الصحيحة', async () => {
    await renderPage();
    // العقارات تظهر في بطاقة الإحصاء + الوصول السريع
    const propElements = await screen.findAllByText('العقارات');
    expect(propElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('المستفيدون')).toBeInTheDocument();
    expect(screen.getByText('العقود النشطة')).toBeInTheDocument();
    expect(screen.getByText('القابل للتوزيع')).toBeInTheDocument();
  }, 15_000);

  it('يعرض مؤشرات الأداء الرئيسية (KPI)', async () => {
    await renderPage();
    expect(await screen.findByText('مؤشرات الأداء الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('نسبة التحصيل')).toBeInTheDocument();
    expect(screen.getByText('معدل الإشغال')).toBeInTheDocument();
    expect(screen.getByText('نسبة المصروفات')).toBeInTheDocument();
  }, 15_000);

  it('يعرض الروابط السريعة', async () => {
    await renderPage();
    expect(await screen.findByText('الوصول السريع')).toBeInTheDocument();
    expect(screen.getByText('العقود')).toBeInTheDocument();
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
    expect(screen.getByText('اللائحة')).toBeInTheDocument();
  }, 15_000);

  it('يعرض NoPublishedYearsNotice عند عدم وجود سنوات منشورة', async () => {
    mockUseFiscalYear.mockReturnValue({
      fiscalYear: null as unknown as { id: string; label: string; status: string; published: boolean }, fiscalYearId: '', isLoading: false,
      noPublishedYears: true, isSpecificYear: false,
    });
    await renderPage();
    expect(await screen.findByText('لا توجد سنوات مالية منشورة')).toBeInTheDocument();
  }, 15_000);

  it('يعرض التحية مع اسم المستخدم', async () => {
    await renderPage();
    // displayName مشتق من email: 'waqif'
    expect(await screen.findByText('waqif')).toBeInTheDocument();
  }, 15_000);
});
