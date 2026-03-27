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
  const latestContract = sorted[0];
  if (latestContract) {
    return {
      name: latestContract.tenant_name,
      status: latestContract.status,
      start_date: latestContract.start_date,
      end_date: latestContract.end_date,
      rent_amount: latestContract.rent_amount,
      contract_id: latestContract.id,
      payment_type: latestContract.payment_type || 'annual',
      payment_amount: latestContract.payment_amount ?? null,
      payment_count: latestContract.payment_count || 1,
    };
  }
  return null;
};

/** واجهة فاتورة دفعة مبسطة */
interface PaymentInvoiceLike {
  contract_id: string;
  status: string;
  due_date: string;
}

/**
 * حساب حالة التحصيل من الفواتير الفعلية (المصدر الوحيد للحقيقة)
 * بدلاً من الحساب الرياضي القديم
 */
export const getPaymentStatusFromInvoices = (
  contractId: string,
  invoices: PaymentInvoiceLike[]
): { status: 'ontime' | 'late'; overdueCount: number } => {
  const contractInvoices = invoices.filter(inv => inv.contract_id === contractId);
  const overdueInvoices = contractInvoices.filter(inv => inv.status === 'overdue');
  if (overdueInvoices.length > 0) {
    return { status: 'late', overdueCount: overdueInvoices.length };
  }
  return { status: 'ontime', overdueCount: 0 };
};


/** حساب الإيجار الشهري — دائماً rent_amount / 12 (rent_amount سنوي) */
export const getMonthlyRent = (tenant: TenantInfo): number => {
  return safeNumber(tenant.rent_amount) / 12;
};

/** حساب الإيجار الشهري من عقد — دائماً rent_amount / 12 */
export const getMonthlyFromContract = (contract: Contract): number => {
  return safeNumber(contract.rent_amount) / 12;
};
