/**
 * فصل المتأخرات حسب تاريخ بداية السنة المالية.
 * مستخرج من useAccountsPage لتقليل حجمه (#A3).
 */
import { useMemo } from 'react';

interface InvoiceLike {
  status: string;
  due_date: string | null;
  amount: number | string | null;
}

export const useOverdueSplit = (
  paymentInvoices: InvoiceLike[],
  fiscalYearStartDate: string | null,
) => {
  return useMemo(() => {
    if (!fiscalYearStartDate) return { prev: 0, cur: 0 };
    const today = new Date().toISOString().slice(0, 10);
    let prev = 0, cur = 0;
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') continue;
      const due = inv.due_date;
      if (!due) continue;
      const amt = Number(inv.amount) || 0;
      if (due < fiscalYearStartDate) prev += amt;
      else if (due <= today) cur += amt;
    }
    return { prev, cur };
  }, [paymentInvoices, fiscalYearStartDate]);
};
