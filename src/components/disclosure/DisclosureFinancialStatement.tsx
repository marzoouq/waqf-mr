import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { fmt } from '@/utils/format';

interface Props {
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  adminPct: number;
  waqifPct: number;
  waqfCorpusManual: number;
  beneficiariesShare: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  currentBeneficiaryName: string;
  currentBeneficiaryPct: number;
}

const DisclosureFinancialStatement = (props: Props) => {
  const {
    incomeBySource, expensesByType, totalIncome, totalExpenses,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, vatAmount, netAfterVat,
    zakatAmount, netAfterZakat, adminShare, waqifShare, adminPct, waqifPct,
    waqfCorpusManual, beneficiariesShare, myShare,
    currentBeneficiaryName, currentBeneficiaryPct,
  } = props;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          البيان المالي التفصيلي
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* الإيرادات */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-success">الإيرادات</h3>
            <div className="space-y-2">
              {Object.entries(incomeBySource).map(([source, amount]) => (
                <div key={source} className="flex justify-between items-center py-2 border-b border-dashed">
                  <span>{source}</span>
                  <span className="text-success font-medium">+{fmt(amount)} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 font-bold bg-success/10 rounded px-2">
                <span>إجمالي الإيرادات</span>
                <span className="text-success">+{fmt(totalIncome)} ر.س</span>
              </div>
            </div>
          </div>

          {/* المصروفات */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
            <div className="space-y-2">
              {Object.entries(expensesByType).map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center py-2 border-b border-dashed">
                  <span>{type}</span>
                  <span className="text-destructive font-medium">-{fmt(amount)} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
                <span>إجمالي المصروفات التشغيلية</span>
                <span className="text-destructive">-{fmt(totalExpenses - vatAmount)} ر.س</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span>ضريبة القيمة المضافة</span>
                  <span className="text-destructive font-medium">-{fmt(vatAmount)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 font-bold bg-destructive/15 rounded px-2">
                <span>إجمالي المصروفات والضريبة</span>
                <span className="text-destructive">-{fmt(totalExpenses)} ر.س</span>
              </div>
            </div>
          </div>

          {/* التسلسل المالي الكامل */}
          <div className="border-t-2 pt-4 space-y-2 sm:space-y-3">
            {waqfCorpusPrevious > 0 && (
              <>
                <div className="flex justify-between items-center py-2 text-info text-sm sm:text-base">
                  <span>(+) رقبة الوقف المرحّلة من العام السابق</span>
                  <span className="whitespace-nowrap mr-2">+{fmt(waqfCorpusPrevious)} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-sm sm:text-base">الإجمالي الشامل</span>
                  <span className="font-bold text-base sm:text-lg whitespace-nowrap mr-2">{fmt(grandTotal)} ر.س</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="font-bold text-sm sm:text-base">الصافي بعد المصاريف</span>
              <span className="font-bold text-base sm:text-lg whitespace-nowrap mr-2">{fmt(netAfterExpenses)} ر.س</span>
            </div>
            <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
              <span>(-) ضريبة القيمة المضافة</span>
              <span className="whitespace-nowrap mr-2">-{fmt(vatAmount)} ر.س</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-bold text-sm sm:text-base">الصافي بعد خصم الضريبة</span>
              <span className="font-bold text-primary text-base sm:text-lg whitespace-nowrap mr-2">{fmt(netAfterVat)} ر.س</span>
            </div>
            {zakatAmount > 0 && (
              <>
                <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
                  <span>(-) الزكاة</span>
                  <span className="whitespace-nowrap mr-2">-{fmt(zakatAmount)} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-sm sm:text-base">الصافي بعد الزكاة</span>
                  <span className="font-bold whitespace-nowrap mr-2">{fmt(netAfterZakat)} ر.س</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
              <span>(-) حصة الناظر ({adminPct}%)</span>
              <span className="whitespace-nowrap mr-2">-{fmt(adminShare)} ر.س</span>
            </div>
            <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
              <span>(-) حصة الواقف ({waqifPct}%)</span>
              <span className="whitespace-nowrap mr-2">-{fmt(waqifShare)} ر.س</span>
            </div>
            {waqfCorpusManual > 0 && (
              <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
                <span>(-) احتياطي رقبة الوقف</span>
                <span className="whitespace-nowrap mr-2">-{fmt(waqfCorpusManual)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 font-bold text-sm sm:text-base">
              <span>الإجمالي القابل للتوزيع</span>
              <span className="whitespace-nowrap mr-2">{fmt(beneficiariesShare)} ر.س</span>
            </div>
          </div>

          {/* حصتي */}
          <div className="bg-primary/10 rounded-xl p-4 sm:p-6 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة ({currentBeneficiaryPct}%)</p>
                <p className="font-bold text-xl sm:text-2xl text-primary">{fmt(myShare)} ر.س</p>
              </div>
              <div className="sm:text-end">
                <p className="text-xs sm:text-sm text-muted-foreground">الاسم</p>
                <p className="font-bold text-sm sm:text-base">{currentBeneficiaryName || 'غير مرتبط'}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisclosureFinancialStatement;
