/**
 * Helpers لـ accountsPdf — استُخرجت للالتزام بحد 200 سطر.
 */
import { safeNumber } from '@/utils/format/safeNumber';
import { fmt } from '@/utils/format/format';

export interface DistributionRowsInput {
  totalIncome: number;
  totalExpenses: number;
  vatAmount?: number;
  zakatAmount?: number;
  netAfterExpenses?: number;
  netAfterVat?: number;
  netAfterZakat?: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual?: number;
  waqfCorpusPrevious?: number;
  grandTotal?: number;
  availableAmount?: number;
  distributionsAmount?: number;
  remainingBalance?: number;
}

/** يبني صفوف جدول التوزيع (التسلسل المالي الهرمي). */
export const buildDistributionRows = (d: DistributionRowsInput): (string | number)[][] => {
  const corpusPrev = d.waqfCorpusPrevious || 0;
  const gt = d.grandTotal || (d.totalIncome + corpusPrev);
  const regularExp = d.totalExpenses;
  const netAfterExp = d.netAfterExpenses ?? (gt - regularExp);
  const netAfterVat = d.netAfterVat ?? (netAfterExp - (d.vatAmount || 0));
  const zakatAmt = d.zakatAmount || 0;
  const netAfterZakatVal = d.netAfterZakat || (netAfterVat - zakatAmt);
  const avail = d.availableAmount ?? (d.waqfRevenue - (d.waqfCorpusManual || 0));
  const remaining = d.remainingBalance ?? (avail - (d.distributionsAmount || 0));

  const rows: (string | number)[][] = [];
  if (corpusPrev > 0) rows.push(['رقبة الوقف المرحلة من العام السابق', `+${fmt(corpusPrev)}`]);
  rows.push(['إجمالي الدخل', `+${fmt(d.totalIncome)}`]);
  if (corpusPrev > 0) rows.push(['الإجمالي الشامل', fmt(gt)]);
  rows.push(
    ['(-) المصروفات التشغيلية', `(${fmt(regularExp)})`],
    ['الصافي بعد المصاريف', fmt(netAfterExp)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(d.vatAmount || 0)})`],
    ['الصافي بعد الضريبة', fmt(netAfterVat)],
  );
  if (zakatAmt > 0) {
    rows.push(
      ['(-) الزكاة', `(${fmt(zakatAmt)})`],
      ['الصافي بعد الزكاة', fmt(netAfterZakatVal)],
    );
  }
  rows.push(
    ['(-) حصة الناظر', `(${fmt(d.adminShare)})`],
    [`الباقي بعد حصة الناظر`, fmt(netAfterZakatVal - d.adminShare)],
    ['(-) حصة الواقف', `(${fmt(d.waqifShare)})`],
    ['ريع الوقف (الإجمالي القابل للتوزيع)', fmt(d.waqfRevenue)],
    ['(-) رقبة الوقف للعام الحالي', `(${fmt(d.waqfCorpusManual || 0)})`],
    ['المبلغ المتاح', fmt(avail)],
    ['(-) التوزيعات', `(${fmt(d.distributionsAmount || 0)})`],
    ['الرصيد المتبقي', fmt(remaining)],
  );
  return rows;
};

/** يبني صفوف جدول حصص المستفيدين. */
export const buildBeneficiaryRows = (
  beneficiaries: Array<{ name: string; share_percentage: number }>,
  distributionsAmount: number,
): (string | number)[][] => {
  const totalBenPct = beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);
  return beneficiaries.map(b => [
    b.name,
    `${safeNumber(b.share_percentage).toFixed(6)}%`,
    totalBenPct > 0 ? fmt(distributionsAmount * safeNumber(b.share_percentage) / totalBenPct) : '0',
  ]);
};
