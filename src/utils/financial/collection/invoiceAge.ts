/** Calendar-day ageing in Riyadh, independent of the browser timezone. */
export function invoiceAgeDays(dueDate: string, status: string, now = new Date()): number {
  if (status === 'paid' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const today = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  return Number.isFinite(due) ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
}

export function invoiceRemaining(amount: number, paidAmount: number, status: string): number {
  return status === 'paid' ? 0 : Math.max(0, Math.round((amount - (paidAmount || 0)) * 100) / 100);
}