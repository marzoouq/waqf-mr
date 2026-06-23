/** أنواع التقرير السنوي المُجمَّع — مستخرجة من aggregatedAnnualReport.ts */

export interface AggregatedAnnualPdfData {
  fiscalYearLabel: string;
  gregorianRange?: string;
  isClosed: boolean;
  // ─── ماليات شاملة ───
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  adminPct: number;
  waqifShare: number;
  waqifPct: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
  // ─── جداول ───
  incomeBySource?: Record<string, number>;
  expensesByType?: Record<string, number>;
  beneficiaries: Array<{ name: string; share_percentage: number; computedShare: number }>;
  distributions: Array<{ date: string; beneficiary: string; amount: number; status: string }>;
  // ─── مقارنة YoY ───
  yoy?: {
    prevLabel: string;
    prevIncome: number;
    prevExpenses: number;
    prevNetAfterZakat: number;
  } | null;
  // ─── محتوى التقرير السنوي ───
  achievements: Array<{ title: string; content: string }>;
  challenges: Array<{ title: string; content: string }>;
  futurePlans: Array<{ title: string; content: string }>;
  propertyStatuses: Array<{ title: string; content: string; propertyName?: string }>;
  // عدّ موجز
  counts: {
    properties: number;
    activeContracts: number;
    beneficiaries: number;
    rentedUnits: number;
    totalUnits: number;
  };
}
