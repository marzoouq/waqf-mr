/**
 * فصل المتأخرات حسب تاريخ بداية السنة المالية.
 * مستخرج من useAccountsPage لتقليل حجمه (#A3).
 */
import { useMemo } from 'react';
import { todayLocalISO } from '@/utils/date/dateOnly';

interface InvoiceLike {
  status: string;
  due_date: string | null;
  amount: number | string | null;
  paid_amount?: number | string | null;
}

export const useOverdueSplit = (
  paymentInvoices: InvoiceLike[],
  fiscalYearStartDate: string | null,
) => {
  return useMemo(() => {
    if (!fiscalYearStartDate) return { prev: 0, cur: 0 };
    const today = todayLocalISO();
    let prev = 0, cur = 0;
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') continue;
      const due = inv.due_date;
      if (!due) continue;
      const amt = Number(inv.amount) || 0;
      const paid = Number(inv.paid_amount) || 0;
      const remaining = inv.status === 'partially_paid' ? Math.max(0, amt - paid) : amt;
      if (remaining <= 0) continue;
      if (due < fiscalYearStartDate) prev += remaining;
      else if (due <= today) cur += remaining;
    }
    return { prev, cur };
  }, [paymentInvoices, fiscalYearStartDate]);
};

