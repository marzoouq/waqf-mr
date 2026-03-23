/**
 * دوال مشتركة لحسابات لوحات التحكم — تُستخدم في AdminDashboard وWaqifDashboard وPropertiesPage
 * لتوحيد المنطق وتجنب التكرار والتناقض
 */
import { safeNumber } from '@/utils/safeNumber';

// ═══ monthlyData ═══
interface DateAmountItem {
  date?: string | null;
  amount?: number | null;
}

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expenses: number;
}

export function computeMonthlyData(
  income: DateAmountItem[],
  expenses: DateAmountItem[]
): MonthlyDataPoint[] {
  const months: Record<string, { income: number; expenses: number }> = {};
  income.forEach(item => {
    const month = item.date?.substring(0, 7);
    if (month) {
      if (!months[month]) months[month] = { income: 0, expenses: 0 };
      months[month].income += safeNumber(item.amount);
    }
  });
  expenses.forEach(item => {
    const month = item.date?.substring(0, 7);
    if (month) {
      if (!months[month]) months[month] = { income: 0, expenses: 0 };
      months[month].expenses += safeNumber(item.amount);
    }
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses }));
}

// ═══ collectionSummary ═══
interface ContractLike {
  id?: string | null;
  status?: string | null;
}

interface InvoiceLike {
  contract_id?: string | null;
  due_date?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  status?: string | null;
}

export interface CollectionSummaryResult {
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  total: number;
  percentage: number;
  totalCollected: number;
  totalExpected: number;
}

export function computeCollectionSummary(
  contracts: ContractLike[],
  paymentInvoices: InvoiceLike[]
): CollectionSummaryResult {
  const relevantContractIds = new Set(
    contracts
      .filter(c => c.status === 'active' || c.status === 'expired')
      .map(c => c.id)
  );
  const nowDate = new Date();
  const dueInvoices = paymentInvoices.filter(
    inv => relevantContractIds.has(inv.contract_id) && new Date(inv.due_date ?? '') <= nowDate
  );
  const totalExpected = dueInvoices.reduce((sum, inv) => sum + safeNumber(inv.amount), 0);
  const totalCollected = dueInvoices.reduce((sum, inv) => {
    if (inv.status === 'paid') return sum + safeNumber(inv.amount);
    if (inv.status === 'partially_paid') return sum + safeNumber(inv.paid_amount);
    return sum;
  }, 0);
  const paidCount = dueInvoices.filter(inv => inv.status === 'paid').length;
  const partialCount = dueInvoices.filter(inv => inv.status === 'partially_paid').length;
  const unpaidCount = dueInvoices.length - paidCount - partialCount;
  const percentage = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return { paidCount, partialCount, unpaidCount, total: dueInvoices.length, percentage, totalCollected, totalExpected };
}

// ═══ occupancy ═══
interface OccupancyContract {
  status?: string | null;
  unit_id?: string | null;
  property_id?: string | null;
}

interface OccupancyUnit {
  id?: string | null;
  property_id?: string | null;
}

export interface OccupancyResult {
  rentedUnits: number;
  totalUnits: number;
  occupancyRate: number;
}

export function computeOccupancy(
  contracts: OccupancyContract[],
  allUnits: OccupancyUnit[],
  isSpecificYear: boolean
): OccupancyResult {
  const rentedUnitIds = new Set(
    contracts
      .filter(c => (isSpecificYear || c.status === 'active') && c.unit_id)
      .map(c => c.unit_id)
  );
  const wholePropertyRentedIds = new Set(
    contracts
      .filter(c => (isSpecificYear || c.status === 'active') && !c.unit_id)
      .map(c => c.property_id)
  );
  const rentedUnits = allUnits.filter(
    u => rentedUnitIds.has(u.id) || wholePropertyRentedIds.has(u.property_id)
  ).length;
  const totalUnits = allUnits.length;
  const hasAnyRelevant = contracts.some(c => isSpecificYear || c.status === 'active');
  const occupancyRate = totalUnits > 0
    ? Math.round((rentedUnits / totalUnits) * 100)
    : (hasAnyRelevant ? 100 : 0);

  return { rentedUnits, totalUnits, occupancyRate };
}
