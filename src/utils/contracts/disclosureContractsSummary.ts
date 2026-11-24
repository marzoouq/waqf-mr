/**
 * ملخص العقود التشغيلية للإفصاح السنوي — عدّادات وقيمة سنوية اسمية فقط،
 * بلا أسماء مستأجرين ولا أرقام عقود (التفاصيل في صفحة العقود المخصصة).
 * عرض فقط: الحالة تُشتق من تاريخ الانتهاء ولا يُكتب شيء في قاعدة البيانات.
 */
import { getEffectiveContractStatus } from '@/utils/contracts/contractStatus';
import { safeNumber } from '@/utils/format/safeNumber';

export interface DisclosureContractInput {
  status?: string | null;
  end_date?: string | null;
  rent_amount?: number | string | null;
}

export interface DisclosureContractsSummary {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  /** مجموع الإيجار السنوي الاسمي للعقود غير الملغاة */
  annualValue: number;
}

export const summarizeDisclosureContracts = (
  contracts: ReadonlyArray<DisclosureContractInput>,
  today?: string,
): DisclosureContractsSummary => {
  const summary: DisclosureContractsSummary = { total: contracts.length, active: 0, expired: 0, cancelled: 0, annualValue: 0 };
  for (const c of contracts) {
    const status = getEffectiveContractStatus(c.status, c.end_date, today);
    if (status === 'cancelled') {
      summary.cancelled += 1;
      continue;
    }
    if (status === 'active') summary.active += 1;
    else summary.expired += 1;
    summary.annualValue += safeNumber(c.rent_amount);
  }
  return summary;
};
