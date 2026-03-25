/**
 * جدول الإفصاح السنوي — مُستخرج من ReportsPage
 */
import { fmt } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface AnnualDisclosureTableProps {
  fiscalYearLabel: string;
  waqfCorpusPrevious: number;
  incomeSourceData: { name: string; value: number }[];
  totalIncome: number;
  grandTotal: number;
  expenseTypeData: { name: string; value: number }[];
  vatAmount: number;
  totalExpenses: number;
  netAfterExpenses: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminPct: number;
  waqifPct: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
}

const AnnualDisclosureTable = ({
  fiscalYearLabel,
  waqfCorpusPrevious,
  incomeSourceData,
  totalIncome,
  grandTotal,
  expenseTypeData,
  vatAmount,
  totalExpenses,
  netAfterExpenses,
  netAfterVat,
  zakatAmount,
  netAfterZakat,
  adminPct,
  waqifPct,
  adminShare,
  waqifShare,
  waqfRevenue,
  waqfCorpusManual,
  availableAmount,
  distributionsAmount,
  remainingBalance,
}: AnnualDisclosureTableProps) => {
  return (
    <Card className="shadow-xs print:break-before-page">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          الإفصاح السنوي ({fiscalYearLabel})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="py-3 px-4 text-right font-bold text-primary">البند</th>
                <th className="py-3 px-4 text-right font-bold text-primary">المبلغ (ر.س)</th>
              </tr>
            </thead>
            <tbody>
              {waqfCorpusPrevious > 0 && (
                <tr className="border-b bg-accent/10">
                  <td className="py-3 px-4 font-medium">رقبة الوقف المرحلة من العام السابق</td>
                  <td className="py-3 px-4 font-bold text-accent-foreground">+{fmt(waqfCorpusPrevious)}</td>
                </tr>
              )}
              <tr className="bg-success/10">
                <td colSpan={2} className="py-2 px-4 font-bold text-success text-center">-- الإيرادات --</td>
              </tr>
              {incomeSourceData.map((item, index) => (
                <tr key={`income-${index}`} className="border-b">
                  <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                  <td className="py-2 px-4 font-medium text-success">+{fmt(item.value)}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-success bg-success/10">
                <td className="py-3 px-4 font-bold">إجمالي الإيرادات</td>
                <td className="py-3 px-4 font-bold text-success">+{fmt(totalIncome)}</td>
              </tr>
              {waqfCorpusPrevious > 0 && (
                <tr className="border-b-2 border-success bg-success/15">
                  <td className="py-3 px-4 font-bold">الإجمالي الشامل</td>
                  <td className="py-3 px-4 font-bold text-success">{fmt(grandTotal)}</td>
                </tr>
              )}
              <tr className="bg-destructive/10">
                <td colSpan={2} className="py-2 px-4 font-bold text-destructive text-center">-- المصروفات --</td>
              </tr>
              {expenseTypeData.map((item, index) => (
                <tr key={`expense-${index}`} className="border-b">
                  <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                  <td className="py-2 px-4 font-medium text-destructive">-{fmt(item.value)}</td>
                </tr>
              ))}
              <tr className="border-b-2 border-destructive bg-destructive/10">
                <td className="py-3 px-4 font-bold">إجمالي المصروفات</td>
                <td className="py-3 px-4 font-bold text-destructive">-{fmt(totalExpenses)}</td>
              </tr>
              <tr className="border-b-2 border-info bg-info/10">
                <td className="py-3 px-4 font-bold">الصافي بعد المصاريف</td>
                <td className="py-3 px-4 font-bold text-info">{fmt(netAfterExpenses)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-muted-foreground">(-) ضريبة القيمة المضافة</td>
                <td className="py-3 px-4 text-destructive">-{fmt(vatAmount)}</td>
              </tr>
              <tr className="border-b-2 border-info bg-info/10">
                <td className="py-3 px-4 font-bold">الصافي بعد الضريبة</td>
                <td className="py-3 px-4 font-bold text-info">{fmt(netAfterVat)}</td>
              </tr>
              {zakatAmount > 0 && (
                <>
                  <tr className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">(-) الزكاة</td>
                    <td className="py-3 px-4 text-destructive">-{fmt(zakatAmount)}</td>
                  </tr>
                  <tr className="border-b-2 border-info bg-info/10">
                    <td className="py-3 px-4 font-bold">الصافي بعد الزكاة</td>
                    <td className="py-3 px-4 font-bold text-info">{fmt(netAfterZakat)}</td>
                  </tr>
                </>
              )}
              <tr className="border-b">
                <td className="py-3 px-4">حصة الناظر ({adminPct}%)</td>
                <td className="py-3 px-4">{fmt(adminShare)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">حصة الواقف ({waqifPct}%)</td>
                <td className="py-3 px-4">{fmt(waqifShare)}</td>
              </tr>
              <tr className="border-b-2 border-primary bg-muted/50">
                <td className="py-3 px-4 font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</td>
                <td className="py-3 px-4 font-bold text-primary">{fmt(waqfRevenue)}</td>
              </tr>
              {waqfCorpusManual > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-4 text-muted-foreground">(-) رقبة الوقف للعام الحالي</td>
                  <td className="py-3 px-4 text-destructive">-{fmt(waqfCorpusManual)}</td>
                </tr>
              )}
              <tr className="border-b bg-primary/5">
                <td className="py-3 px-4 font-bold">المبلغ المتاح</td>
                <td className="py-3 px-4 font-bold text-primary">{fmt(availableAmount)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-muted-foreground">(-) التوزيعات</td>
                <td className="py-3 px-4">{fmt(distributionsAmount)}</td>
              </tr>
              <tr className="border-b-2 border-primary bg-primary/10">
                <td className="py-3 px-4 font-bold text-lg">الرصيد المتبقي</td>
                <td className={`py-3 px-4 font-bold text-lg ${remainingBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(remainingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnualDisclosureTable;
