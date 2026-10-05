/**
 * اختبارات حراس حالات صفحة «حصتي من الريع» — الفروع التي تحمي المستفيد من أرقام خاطئة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const s = vi.hoisted(() => ({ fy: { noPublishedYears: false }, page: {} as Record<string, unknown> }));

vi.mock('@/contexts/FiscalYearContext', () => ({ useFiscalYear: () => s.fy }));
vi.mock('@/hooks/page/beneficiary', () => ({ useMySharePage: () => s.page }));
vi.mock('@/components/layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeaderCard: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/common', () => ({
  RequirePublishedYears: ({ children, title }: { children: React.ReactNode; title: string }) =>
    s.fy.noPublishedYears ? <div>لا سنوات منشورة: {title}</div> : <>{children}</>,
  ExportMenu: () => null,
  DashboardSkeleton: () => <div>جارٍ التحميل</div>,
  ErrorState: ({ message }: { message?: string }) => <div>خطأ: {message ?? 'عام'}</div>,
  FiscalYearStateNotice: () => null,
}));
vi.mock('@/components/beneficiary/UnlinkedAccountNotice', () => ({ default: () => <div>حساب غير مرتبط</div> }));
vi.mock('@/components/beneficiary/my-share/AdvanceRequestDialog', () => ({ default: () => null }));
vi.mock('@/components/beneficiary/my-share/MyShareSummaryCards', () => ({
  default: ({ myShare }: { myShare: number }) => <div>الحصة: {myShare}</div>,
}));
vi.mock('@/components/beneficiary/my-share/DistributionsTable', () => ({ default: () => null }));
vi.mock('@/components/beneficiary/my-share/AdvancesTable', () => ({ default: () => null }));
vi.mock('@/components/beneficiary/my-share/CarryforwardsTable', () => ({ default: () => null }));
vi.mock('@/components/beneficiary/my-share/DeductionsExplanationCard', () => ({ default: () => null }));

import MySharePage from './MySharePage';

const basePage = {
  isLoading: false, isError: false, handleRetry: vi.fn(),
  currentBeneficiary: { id: 'b1', name: 'مستفيد' }, isAccountMissing: false, isClosed: true,
  myShare: 12345, totalReceived: 0, pendingAmount: 0, paidAdvancesTotal: 0, carryforwardBalance: 0,
  filteredDistributions: [], myAdvances: [], myCarryforwards: [],
  advancesEnabled: false, advanceSettings: {}, fiscalYearId: 'fy-1', selectedFY: { id: 'fy-1', label: '2024-2025' },
  handleDownloadPDF: vi.fn(), handleDownloadDistributionsPDF: vi.fn(), handleDownloadComprehensivePDF: vi.fn(), handlePrintReport: vi.fn(),
};

const renderPage = () => render(<MemoryRouter><MySharePage /></MemoryRouter>);

beforeEach(() => { s.fy = { noPublishedYears: false }; s.page = { ...basePage }; });

describe('MySharePage — حراس الحالات', () => {
  it('لا سنوات منشورة: يُعرض الحارس ولا تُعرض «حساب غير مرتبط» خطأً', () => {
    s.fy = { noPublishedYears: true };
    s.page = { ...basePage, currentBeneficiary: null };
    renderPage();
    expect(screen.getByText(/لا سنوات منشورة/)).toBeInTheDocument();
    expect(screen.queryByText('حساب غير مرتبط')).toBeNull();
  });

  it('أثناء التحميل لا تظهر أي أرقام', () => {
    s.page = { ...basePage, isLoading: true };
    renderPage();
    expect(screen.getByText('جارٍ التحميل')).toBeInTheDocument();
    expect(screen.queryByText(/الحصة:/)).toBeNull();
  });

  it('المستخدم غير المرتبط بمستفيد يرى تنبيه الربط', () => {
    s.page = { ...basePage, currentBeneficiary: null };
    renderPage();
    expect(screen.getByText('حساب غير مرتبط')).toBeInTheDocument();
  });

  it('سنة مقفلة بلا حساب ختامي: تحذير بدل أرقام', () => {
    s.page = { ...basePage, isAccountMissing: true, isClosed: true };
    renderPage();
    expect(screen.getByText('خطأ: لم يتم العثور على الحساب الختامي')).toBeInTheDocument();
    expect(screen.queryByText(/الحصة:/)).toBeNull();
  });

  it('الحالة السليمة تعرض الحصة', () => {
    renderPage();
    expect(screen.getByText('حصتي من الريع')).toBeInTheDocument();
    expect(screen.getByText('الحصة: 12345')).toBeInTheDocument();
  });
});
