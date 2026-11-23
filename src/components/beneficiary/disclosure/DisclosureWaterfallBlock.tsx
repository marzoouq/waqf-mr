/**
 * مسار الريع في الإفصاح — نفس البنود والقيم السابقة، معروضة بأشرطة متتالية.
 * لا حساب هنا: كل قيمة تصل جاهزة من الخادم وتُعرض كما هي.
 */
import { RevenueWaterfall } from '@/components/common';
import type { WaterfallRow } from '@/types';

interface Props {
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  adminPct: number;
  waqifShare: number;
  waqifPct: number;
  waqfCorpusManual: number;
  beneficiariesShare: number;
}

const DisclosureWaterfallBlock = (p: Props) => {
  const rows: WaterfallRow[] = [
    ...(p.waqfCorpusPrevious > 0 ? [
      { kind: 'plus', label: 'رقبة الوقف المرحّلة من العام السابق', value: p.waqfCorpusPrevious },
      { kind: 'subtotal', label: 'الإجمالي الشامل', value: p.grandTotal },
    ] satisfies WaterfallRow[] : []),
    { kind: 'subtotal', label: 'الصافي بعد المصاريف', value: p.netAfterExpenses },
    { kind: 'vat', label: 'ضريبة القيمة المضافة', value: p.vatAmount },
    { kind: 'subtotal', label: 'الصافي بعد خصم الضريبة', value: p.netAfterVat },
    ...(p.zakatAmount > 0 ? [
      { kind: 'minus', label: 'الزكاة', value: p.zakatAmount },
      { kind: 'subtotal', label: 'الصافي بعد الزكاة', value: p.netAfterZakat },
    ] satisfies WaterfallRow[] : []),
    { kind: 'share', label: 'حصة الناظر', value: p.adminShare, note: p.adminPct > 0 ? `${p.adminPct}%` : undefined },
    { kind: 'share', label: 'حصة الواقف', value: p.waqifShare, note: p.waqifPct > 0 ? `${p.waqifPct}%` : undefined },
    ...(p.waqfCorpusManual > 0 ? [
      { kind: 'minus', label: 'احتياطي رقبة الوقف', value: p.waqfCorpusManual },
    ] satisfies WaterfallRow[] : []),
    { kind: 'total', label: 'الإجمالي القابل للتوزيع', value: p.beneficiariesShare },
  ];
  const base = p.waqfCorpusPrevious > 0 ? p.grandTotal : Math.max(p.grandTotal, p.netAfterExpenses);
  return (
    <section aria-label="مسار الريع" className="border-t-2 pt-4">
      <h4 className="font-display font-bold text-lg text-primary dark:text-foreground mb-2">مسار الريع</h4>
      <div className="-mx-4 sm:-mx-5 rounded-lg overflow-hidden">
        <RevenueWaterfall rows={rows} base={base} />
      </div>
    </section>
  );
};

export default DisclosureWaterfallBlock;
