/**
 * أنواع مدخلات هوك useAccountsActions — مفصولة للحفاظ على حدود حجم الهوك.
 */
import type { Contract, Beneficiary } from '@/types';

export interface AccountsActionsParams {
  selectedFY: { id: string; label: string; status: string; start_date?: string | null } | null;
  fiscalYear: string;
  fiscalYearId: string | undefined;
  accounts: unknown[];
  totalIncome: number;
  totalExpenses: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  grandTotal: number;
  availableAmount: number;
  remainingBalance: number;
  contracts: Contract[];
  beneficiaries: Beneficiary[];
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  manualVat: number;
  manualDistributions: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  fiscalYearStartDate?: string | null;
  overdueFromPreviousAmount?: number;
  overdueInYearAmount?: number;
}
