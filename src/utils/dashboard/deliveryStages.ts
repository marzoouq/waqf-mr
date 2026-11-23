/**
 * مراحل تسليم حصة المستفيد للسنة المختارة — دالة نقية للعرض فقط.
 * لا تحسب أي مبلغ؛ تقرأ حالة السنة وتوزيعاتها كما هي.
 */

export interface DeliveryDistribution {
  amount: number;
  date: string;
  status: string;
  fiscal_year_id?: string | null;
}

export interface DeliveryStage {
  key: 'year' | 'closed' | 'delivered';
  label: string;
  done: boolean;
  /** تاريخ المرحلة إن وُجد (ISO) */
  date?: string;
}

/**
 * Builds the three display stages: year running → year closed → share delivered.
 * التسليم يُعتبر منجزاً فقط إذا وُجد توزيع مدفوع لنفس السنة المختارة.
 */
export function buildDeliveryStages(params: {
  isClosed: boolean;
  fiscalYearId: string | null | undefined;
  distributions: ReadonlyArray<DeliveryDistribution>;
}): DeliveryStage[] {
  const { isClosed, fiscalYearId, distributions } = params;
  const paidThisYear = fiscalYearId
    ? distributions
        .filter((d) => d.status === 'paid' && d.fiscal_year_id === fiscalYearId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;

  return [
    { key: 'year', label: 'السنة المالية', done: true },
    { key: 'closed', label: 'إقفال السنة', done: isClosed },
    { key: 'delivered', label: 'التسليم', done: !!paidThisYear, date: paidThisYear?.date },
  ];
}
