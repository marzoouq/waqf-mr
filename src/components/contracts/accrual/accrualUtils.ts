/**
 * ثوابت/أنواع/دوال جدول الاستحقاقات الشهري — مُستخرَجة لتفعيل Fast Refresh
 */
import { fmtInt } from '@/utils/format/format';
import { MONTH_NAMES } from '@/constants/calendar';

export { MONTH_NAMES };

export interface MonthCell {
  label: string;
  month: number;
  year: number;
}

export type CellStatus = 'paid' | 'overdue' | 'pending' | 'empty';

export interface CellData {
  amount: number;
  status: CellStatus;
}

export const fmtNum = (v: number) => fmtInt(v);

/** بناء شبكة 12 شهر ديناميكية تبدأ من شهر بداية السنة المالية */
export const buildFiscalMonthGrid = (fiscalYear?: { start_date: string; end_date: string } | null): MonthCell[] => {
  const startDate = fiscalYear?.start_date ? new Date(fiscalYear.start_date) : new Date();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  return Array.from({ length: 12 }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    return { label: MONTH_NAMES[m]!, month: m, year: y };
  });
};

/** تحديد لون الخلية حسب حالة الفاتورة */
export const getCellClasses = (status: CellStatus): string => {
  switch (status) {
    case 'paid': return 'bg-success/10 text-success font-medium';
    case 'overdue': return 'bg-destructive/10 text-destructive font-medium';
    case 'pending': return 'text-foreground font-medium';
    case 'empty': return 'text-muted-foreground/40';
  }
};
