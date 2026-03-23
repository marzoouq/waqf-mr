/** دوال مساعدة لمنطق الوحدات والتحصيل */
import { Contract } from '@/types/database';
import { safeNumber } from '@/utils/safeNumber';

export interface TenantInfo {
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number;
  contract_id: string;
  payment_type: string;
  payment_amount: number | null;
  payment_count: number;
}

/** استخراج معلومات المستأجر من العقود المرتبطة بالوحدة */
export const getTenantFromContracts = (unitId: string, contracts: Contract[]): TenantInfo | null => {
  const activeContract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
  if (activeContract) {
    return {
      name: activeContract.tenant_name,
      status: 'active',
      start_date: activeContract.start_date,
      end_date: activeContract.end_date,
      rent_amount: activeContract.rent_amount,
      contract_id: activeContract.id,
      payment_type: activeContract.payment_type || 'annual',
      payment_amount: activeContract.payment_amount ?? null,
      payment_count: activeContract.payment_count || 1,
    };
  }
  const sorted = contracts
    .filter(c => c.unit_id === unitId)
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  const any = sorted[0];
  if (any) {
    return {
      name: any.tenant_name,
      status: any.status,
      start_date: any.start_date,
      end_date: any.end_date,
      rent_amount: any.rent_amount,
      contract_id: any.id,
      payment_type: any.payment_type || 'annual',
      payment_amount: any.payment_amount ?? null,
      payment_count: any.payment_count || 1,
    };
  }
  return null;
};

/** حساب حالة التحصيل (منتظم أو متأخر) */
export const getPaymentStatus = (
  tenant: TenantInfo,
  paidMonths: number
): { status: 'ontime' | 'late'; overdueCount: number } => {
  if (tenant.status !== 'active' || !tenant.start_date) return { status: 'ontime', overdueCount: 0 };
  const start = new Date(tenant.start_date);
  const today = new Date();
  const totalMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (totalMonths < 0) return { status: 'ontime', overdueCount: 0 };
  let expectedPayments: number;
  const pt = tenant.payment_type;
  if (pt === 'monthly') expectedPayments = totalMonths;
  else if (pt === 'multi') expectedPayments = Math.floor(totalMonths / (12 / (tenant.payment_count || 1)));
  else expectedPayments = Math.floor(totalMonths / 12);
  const overdue = expectedPayments - paidMonths;
  if (overdue > 0) return { status: 'late', overdueCount: overdue };
  return { status: 'ontime', overdueCount: 0 };
};

/** حساب الإيجار الشهري من بيانات المستأجر */
/** حساب الإيجار الشهري — دائماً rent_amount / 12 (rent_amount سنوي) */
export const getMonthlyRent = (tenant: TenantInfo): number => {
  return safeNumber(tenant.rent_amount) / 12;
};

/** حساب الإيجار الشهري من عقد */
/** حساب الإيجار الشهري من عقد — دائماً rent_amount / 12 */
export const getMonthlyFromContract = (contract: Contract): number => {
  return safeNumber(contract.rent_amount) / 12;
};
