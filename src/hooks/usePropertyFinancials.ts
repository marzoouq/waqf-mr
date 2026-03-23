/**
 * حساب المؤشرات المالية لكل عقار — hook مشترك بين صفحتي الناظر والمستفيد
 * يوحّد منطق: الإشغال، الدخل النشط، الشهري، المصروفات، الصافي
 */
import { safeNumber } from '@/utils/safeNumber';

interface Contract {
  id?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  status?: string | null;
  rent_amount?: number | null;
  payment_type?: string | null;
  payment_amount?: number | null;
}

interface Expense {
  id: string;
  property_id?: string | null;
  amount?: number | null;
}

interface Unit {
  id: string;
  property_id?: string | null;
  status?: string;
}

export interface PropertyFinancials {
  /** عدد الوحدات */
  totalUnits: number;
  /** عدد المؤجرة */
  rented: number;
  /** عدد الشاغرة */
  vacant: number;
  /** عدد في الصيانة */
  maintenance: number;
  /** نسبة الإشغال */
  occupancy: number;
  /** لون الإشغال (CSS token) */
  occupancyColor: string;
  /** لون شريط التقدم */
  progressColor: string;
  /** تضارب حالة الوحدات */
  statusMismatch: number;
  /** الإيرادات التعاقدية (جميع العقود) */
  contractualRevenue: number;
  /** الدخل النشط (active فقط أو الكل حسب السنة) */
  activeAnnualRent: number;
  /** الإيجار الشهري */
  monthlyRent: number;
  /** إجمالي المصروفات */
  totalExpenses: number;
  /** صافي الدخل */
  netIncome: number;
}

export function computePropertyFinancials(params: {
  propertyId: string;
  contracts: Contract[];
  expenses: Expense[];
  units: Unit[];
  isSpecificYear: boolean;
}): PropertyFinancials {
  const { propertyId, contracts, expenses, units, isSpecificYear } = params;

  const propertyUnits = units.filter(u => u.property_id === propertyId);
  const allPropertyContracts = contracts.filter(c => c.property_id === propertyId);
  const propContracts = allPropertyContracts;

  // --- الإشغال ---
  const rentedUnitIds = new Set(
    propContracts
      .filter(c => (isSpecificYear || c.status === 'active') && c.unit_id)
      .map(c => c.unit_id)
  );
  const hasWholePropertyContract = propContracts.some(
    c => (isSpecificYear || c.status === 'active') && !c.unit_id
  );
  const totalUnits = propertyUnits.length;
  const isWholePropertyRented = totalUnits === 0 && hasWholePropertyContract;
  const unitBasedRented = propertyUnits.filter(u => rentedUnitIds.has(u.id)).length;
  const rented =
    totalUnits > 0 && hasWholePropertyContract && unitBasedRented === 0
      ? totalUnits
      : isWholePropertyRented
        ? totalUnits
        : unitBasedRented;
  const vacant = totalUnits - rented;
  const maintenance = propertyUnits.filter(
    u => u.status === 'صيانة' && !rentedUnitIds.has(u.id) && !isWholePropertyRented
  ).length;
  const statusMismatch = propertyUnits.filter(
    u =>
      (u.status === 'مؤجرة' && !rentedUnitIds.has(u.id) && !hasWholePropertyContract) ||
      (u.status === 'شاغرة' && rentedUnitIds.has(u.id))
  ).length;
  const occupancy = totalUnits > 0
    ? Math.round((rented / totalUnits) * 100)
    : isWholePropertyRented ? 100 : 0;

  // --- المالية ---
  const contractualRevenue = allPropertyContracts.reduce(
    (sum, c) => sum + safeNumber(c.rent_amount), 0
  );
  const activeContracts = isSpecificYear
    ? allPropertyContracts
    : allPropertyContracts.filter(c => c.status === 'active');
  const activeAnnualRent = activeContracts.reduce(
    (sum, c) => sum + safeNumber(c.rent_amount), 0
  );
  const monthlyRent = allPropertyContracts.reduce((sum, c) => {
    const rent = safeNumber(c.rent_amount);
    if (c.payment_type === 'monthly') return sum + (safeNumber(c.payment_amount) || rent / 12);
    return sum + rent / 12;
  }, 0);

  const propExpenses = expenses.filter(e => e.property_id === propertyId);
  const totalExpenses = propExpenses.reduce((sum, e) => sum + safeNumber(e.amount), 0);
  const netIncome = contractualRevenue - totalExpenses;

  // --- الألوان ---
  const occupancyColor = occupancy >= 80 ? 'text-success' : occupancy >= 50 ? 'text-warning' : 'text-destructive';
  const progressColor = occupancy >= 80 ? '[&>div]:bg-success' : occupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

  return {
    totalUnits, rented, vacant, maintenance, occupancy,
    occupancyColor, progressColor, statusMismatch,
    contractualRevenue, activeAnnualRent, monthlyRent,
    totalExpenses, netIncome,
  };
}
