/**
 * Props مشتركة لعروض عقود الحسابات (جدول سطح المكتب / قائمة الجوال) — منع التكرار.
 */
import type { Contract } from '@/types';

export interface AccountsContractsViewProps {
  contracts: Contract[];
  getPaymentPerPeriod: (c: Contract) => number;
  getExpectedPayments: (c: Contract) => number;
  totalPaymentPerPeriod: number;
  totalAnnualRent: number;
  totalPayments: number;
  statusLabel: (status: string) => string;
  onEditContract: (c: Contract) => void;
  onDeleteContract: (id: string, name: string) => void;
  fiscalYearStartDate: string | null;
  countInYear: number;
  countFromPrevious: number;
}
