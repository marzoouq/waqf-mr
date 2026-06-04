/**
 * Fixtures لـ useDisclosurePage / useAccountsViewPage
 * يمثّل بيانات إفصاح مستفيد لسنة نشطة — يُغيَّر fyId في الاختبار لإثبات H-02.
 */
import type { useDisclosurePage } from '@/hooks/page/beneficiary';
import type { useAccountsViewPage } from '@/hooks/page/beneficiary';

type DisclosureReturn = ReturnType<typeof useDisclosurePage>;
type AccountsReturn = ReturnType<typeof useAccountsViewPage>;

export const disclosureFixture: DisclosureReturn = {
  isLoading: false,
  isError: false,
  isAccountMissing: false,
  selectedFY: {
    id: 'fy-active',
    label: '2024-2025',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    published: true,
  } as never,
  handleRetry: () => {},
  totalIncome: 1_500_000,
  totalExpenses: 300_000,
  vatAmount: 45_000,
  zakatAmount: 25_000,
  waqfCorpusManual: 100_000,
  waqfCorpusPrevious: 50_000,
  grandTotal: 1_550_000,
  netAfterExpenses: 1_200_000,
  netAfterVat: 1_155_000,
  netAfterZakat: 1_130_000,
  adminShare: 56_500,
  waqifShare: 56_500,
  adminPct: 5,
  waqifPct: 5,
  beneficiariesShare: 917_000,
  incomeBySource: [],
  expensesByTypeExcludingVat: [],
  currentBeneficiary: { id: 'ben-1', name: 'مستفيد تجريبي', share_percentage: 10 } as never,
  myShare: 91_700,
  totalReceived: 50_000,
  pendingAmount: 41_700,
  gregorianFiscalYear: '2024-2025',
  contracts: [],
  handleDownloadPDF: () => Promise.resolve(),
  handleDownloadComprehensivePDF: () => Promise.resolve(),
};

export const accountsViewFixture: AccountsReturn = {
  finLoading: false,
  finError: false,
  isAccountMissing: false,
  selectedFY: disclosureFixture.selectedFY,
  currentBeneficiary: disclosureFixture.currentBeneficiary,
  totalIncome: 1_500_000,
  totalExpenses: 300_000,
  netAfterZakat: 1_130_000,
  availableAmount: 917_000,
  myShare: 91_700,
  handleRetry: () => {},
  handleExportPdf: () => Promise.resolve(),
  navigate: () => {},
} as never;
