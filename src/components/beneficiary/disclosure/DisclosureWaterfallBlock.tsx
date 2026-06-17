import { fmt } from '@/utils/format/format';

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

const DisclosureWaterfallBlock = ({
  waqfCorpusPrevious, grandTotal, netAfterExpenses, vatAmount, netAfterVat,
  zakatAmount, netAfterZakat, adminShare, adminPct, waqifShare, waqifPct,
  waqfCorpusManual, beneficiariesShare,
}: Props) => (
  <div className="border-t-2 pt-4 space-y-2 sm:space-y-3">
    {waqfCorpusPrevious > 0 && (
      <>
        <div className="flex justify-between items-center py-2 text-info text-sm sm:text-base">
          <span>(+) رقبة الوقف المرحّلة من العام السابق</span>
          <span className="whitespace-nowrap ms-2">+{fmt(waqfCorpusPrevious)} ر.س</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="font-bold text-sm sm:text-base">الإجمالي الشامل</span>
          <span className="font-bold text-base sm:text-lg whitespace-nowrap ms-2">{fmt(grandTotal)} ر.س</span>
        </div>
      </>
    )}
    <div className="flex justify-between items-center py-2">
      <span className="font-bold text-sm sm:text-base">الصافي بعد المصاريف</span>
      <span className="font-bold text-base sm:text-lg whitespace-nowrap ms-2">{fmt(netAfterExpenses)} ر.س</span>
    </div>
    <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
      <span>(-) ضريبة القيمة المضافة</span>
      <span className="whitespace-nowrap ms-2">-{fmt(vatAmount)} ر.س</span>
    </div>
    <div className="flex justify-between items-center py-2">
      <span className="font-bold text-sm sm:text-base">الصافي بعد خصم الضريبة</span>
      <span className="font-bold text-primary text-base sm:text-lg whitespace-nowrap ms-2">{fmt(netAfterVat)} ر.س</span>
    </div>
    {zakatAmount > 0 && (
      <>
        <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
          <span>(-) الزكاة</span>
          <span className="whitespace-nowrap ms-2">-{fmt(zakatAmount)} ر.س</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="font-bold text-sm sm:text-base">الصافي بعد الزكاة</span>
          <span className="font-bold whitespace-nowrap ms-2">{fmt(netAfterZakat)} ر.س</span>
        </div>
      </>
    )}
    <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
      <span>(-) حصة الناظر ({adminPct}%)</span>
      <span className="whitespace-nowrap ms-2">-{fmt(adminShare)} ر.س</span>
    </div>
    <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
      <span>(-) حصة الواقف ({waqifPct}%)</span>
      <span className="whitespace-nowrap ms-2">-{fmt(waqifShare)} ر.س</span>
    </div>
    {waqfCorpusManual > 0 && (
      <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
        <span>(-) احتياطي رقبة الوقف</span>
        <span className="whitespace-nowrap ms-2">-{fmt(waqfCorpusManual)} ر.س</span>
      </div>
    )}
    <div className="flex justify-between items-center py-2 font-bold text-sm sm:text-base">
      <span>الإجمالي القابل للتوزيع</span>
      <span className="whitespace-nowrap ms-2">{fmt(beneficiariesShare)} ر.س</span>
    </div>
  </div>
);

export default DisclosureWaterfallBlock;
