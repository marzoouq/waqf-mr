/**
 * عقد حراس الحالات المشترك لشاشات المستفيد: الإفصاح السنوي، الحسابات الختامية، لوحة المستفيد.
 * جدول واحد بدل تكرار نفس الاختبار في ثلاثة ملفات (بوابة التكرار).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const s = vi.hoisted(() => ({ fy: { noPublishedYears: false } as Record<string, unknown>, page: {} as Record<string, unknown> }));
const { Null } = vi.hoisted(() => ({ Null: () => null }));

vi.mock('@/contexts/FiscalYearContext', () => ({ useFiscalYear: () => s.fy }));
vi.mock('@/hooks/page/beneficiary', () => ({
  useDisclosurePage: () => s.page, useAccountsViewPage: () => s.page, useBeneficiaryDashboardPage: () => s.page,
}));
vi.mock('@/components/layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeaderCard: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/common', () => ({
  RequirePublishedYears: ({ children }: { children: React.ReactNode }) =>
    s.fy.noPublishedYears ? <div>لا سنوات منشورة</div> : <>{children}</>,
  NoPublishedYearsNotice: () => <div>لا سنوات منشورة</div>,
  ExportMenu: Null, FiscalYearStateNotice: Null,
  DeferredRender: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DashboardSkeleton: () => <div>جارٍ التحميل</div>,
  ErrorState: ({ message }: { message?: string }) => <div>خطأ: {message ?? 'عام'}</div>,
}));
vi.mock('@/components/beneficiary/UnlinkedAccountNotice', () => ({ default: () => <div>حساب غير مرتبط</div> }));
vi.mock('@/components/accounts', () => ({ AccountsSummaryCards: () => <div>محتوى سليم</div>, AccountsViewMyShare: Null }));
vi.mock('@/components/beneficiary/disclosure/DisclosureSummaryCards', () => ({ default: () => <div>محتوى سليم</div> }));
vi.mock('@/components/beneficiary/disclosure/DisclosureContractsSection', () => ({ default: Null }));
vi.mock('@/components/beneficiary/disclosure/DisclosureFinancialStatement', () => ({ default: Null }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryWelcomeCard', () => ({ default: () => <div>محتوى سليم</div> }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryStatsRow', () => ({ default: Null }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryQuickLinks', () => ({ default: Null }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryRecentDistributions', () => ({ default: Null }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryNotificationsCard', () => ({ default: Null }));
vi.mock('@/components/beneficiary/dashboard/BeneficiaryAdvanceCard', () => ({ default: Null }));

import DisclosurePage from './DisclosurePage';
import AccountsViewPage from './AccountsViewPage';
import BeneficiaryDashboard from './BeneficiaryDashboard';

const healthy = {
  isLoading: false, finLoading: false, dashLoading: false, isError: false, finError: false, dashError: false,
  handleRetry: vi.fn(), currentBeneficiary: { id: 'b1', name: 'مستفيد' }, isAccountMissing: false,
  selectedFY: { id: 'fy-1', label: '2024-2025', status: 'closed' }, fiscalYearId: 'fy-1',
  fyReady: true, isVisible: () => true, greetingData: { greetingIconName: 'sun' },
};

const PAGES = [
  { name: 'الإفصاح السنوي', C: DisclosurePage, loading: 'isLoading', error: 'isError', closedMissing: true },
  { name: 'الحسابات الختامية', C: AccountsViewPage, loading: 'finLoading', error: 'finError', closedMissing: true },
  { name: 'لوحة المستفيد', C: BeneficiaryDashboard, loading: 'isLoading', error: 'dashError', closedMissing: false },
] as const;

const renderC = (C: React.ComponentType) => render(<MemoryRouter><C /></MemoryRouter>);

beforeEach(() => { s.fy = { noPublishedYears: false, fiscalYearId: 'fy-1' }; s.page = { ...healthy }; });

describe.each(PAGES)('$name — حراس الحالات', ({ C, loading, error, closedMissing }) => {
  it('التحميل يُخفي المحتوى', () => {
    s.page = { ...healthy, [loading]: true };
    renderC(C);
    expect(screen.getByText('جارٍ التحميل')).toBeInTheDocument();
    expect(screen.queryByText('محتوى سليم')).toBeNull();
  });

  it('الخطأ يُظهر حالة الخطأ لا الأرقام', () => {
    s.page = { ...healthy, [error]: true };
    renderC(C);
    expect(screen.getByText(/^خطأ:/)).toBeInTheDocument();
    expect(screen.queryByText('محتوى سليم')).toBeNull();
  });

  it('المستخدم غير المرتبط يرى تنبيه الربط', () => {
    s.page = { ...healthy, currentBeneficiary: null };
    renderC(C);
    expect(screen.getByText('حساب غير مرتبط')).toBeInTheDocument();
  });

  if (closedMissing) {
    it('سنة مقفلة بلا حساب ختامي: لا تُعرض أرقام', () => {
      s.page = { ...healthy, isAccountMissing: true };
      renderC(C);
      expect(screen.queryByText('محتوى سليم')).toBeNull();
    });
  }
});

describe('لوحة المستفيد — H2', () => {
  it('لا يُعرض «غير مرتبط» قبل جاهزية السنة المالية', () => {
    s.page = { ...healthy, fyReady: false, currentBeneficiary: null, dashLoading: false };
    renderC(BeneficiaryDashboard);
    expect(screen.queryByText('حساب غير مرتبط')).toBeNull();
  });
});
