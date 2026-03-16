import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableRow, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';

interface BalanceSheetProps {
  totalIncome: number;
  totalExpenses: number;
  vatAmount: number;
  zakatAmount: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusPrevious: number;
  waqfCorpusManual: number;
  distributionsAmount: number;
  availableAmount: number;
  grandTotal: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  fiscalYearLabel?: string;
}

/** R-2: تقرير الميزانية العمومية — عرض الأصول والالتزامات وحقوق الملكية */
const BalanceSheetReport = ({
  totalIncome, totalExpenses, vatAmount, zakatAmount,
  adminShare, waqifShare, waqfRevenue,
  waqfCorpusPrevious, waqfCorpusManual,
  distributionsAmount, availableAmount,
  grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
  fiscalYearLabel,
}: BalanceSheetProps) => {

  // الأصول = إجمالي الإيرادات + المرحّل
  const totalAssets = grandTotal;

  // الالتزامات = ضريبة + زكاة + مصروفات
  const totalLiabilities = totalExpenses + vatAmount + zakatAmount;

  // حقوق الملكية = حصة الناظر + حصة الواقف + ريع الوقف + رقبة الوقف
  const totalEquity = adminShare + waqifShare + waqfRevenue + waqfCorpusManual;

  // التحقق: الأصول = الالتزامات + حقوق الملكية + التوزيعات + الرصيد المتبقي
  const balanceCheck = totalAssets - totalLiabilities - totalEquity - distributionsAmount;
  const isBalanced = Math.abs(balanceCheck) < 1;

  const fmt = (n: number) => n.toLocaleString('ar-SA');

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          الميزانية العمومية {fiscalYearLabel && `(${fiscalYearLabel})`}
          {isBalanced ? (
            <Badge variant="secondary" className="bg-success/10 text-success text-xs mr-auto">متوازنة ✓</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs mr-auto">فرق: {fmt(balanceCheck)} ر.س</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* الأصول */}
        <div>
          <h3 className="font-bold text-sm text-primary mb-2 border-b-2 border-primary pb-1">الأصول (الموارد)</h3>
          <Table>
            <TableBody>
              {waqfCorpusPrevious > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">رقبة الوقف المرحّلة</TableCell>
                  <TableCell className="text-left font-medium">{fmt(waqfCorpusPrevious)} ر.س</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="text-muted-foreground">إجمالي الإيرادات</TableCell>
                <TableCell className="text-left font-medium text-success">{fmt(totalIncome)} ر.س</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className="bg-primary/5">
                <TableCell className="font-bold">إجمالي الأصول</TableCell>
                <TableCell className="text-left font-bold text-primary">{fmt(totalAssets)} ر.س</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* الالتزامات */}
        <div>
          <h3 className="font-bold text-sm text-destructive mb-2 border-b-2 border-destructive pb-1">الالتزامات</h3>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">المصروفات التشغيلية</TableCell>
                <TableCell className="text-left font-medium text-destructive">{fmt(totalExpenses)} ر.س</TableCell>
              </TableRow>
              {vatAmount > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">ضريبة القيمة المضافة</TableCell>
                  <TableCell className="text-left font-medium text-destructive">{fmt(vatAmount)} ر.س</TableCell>
                </TableRow>
              )}
              {zakatAmount > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">الزكاة</TableCell>
                  <TableCell className="text-left font-medium text-destructive">{fmt(zakatAmount)} ر.س</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-destructive/5">
                <TableCell className="font-bold">إجمالي الالتزامات</TableCell>
                <TableCell className="text-left font-bold text-destructive">{fmt(totalLiabilities)} ر.س</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* حقوق الملكية */}
        <div>
          <h3 className="font-bold text-sm text-accent-foreground mb-2 border-b-2 border-accent pb-1">حقوق الملكية والتوزيعات</h3>
          <Table>
            <TableBody>
              {adminShare > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">حصة الناظر</TableCell>
                  <TableCell className="text-left font-medium">{fmt(adminShare)} ر.س</TableCell>
                </TableRow>
              )}
              {waqifShare > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">حصة الواقف</TableCell>
                  <TableCell className="text-left font-medium">{fmt(waqifShare)} ر.س</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="text-muted-foreground">ريع الوقف (للمستفيدين)</TableCell>
                <TableCell className="text-left font-medium text-primary">{fmt(waqfRevenue)} ر.س</TableCell>
              </TableRow>
              {waqfCorpusManual > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">رقبة الوقف اليدوية</TableCell>
                  <TableCell className="text-left font-medium">{fmt(waqfCorpusManual)} ر.س</TableCell>
                </TableRow>
              )}
              {distributionsAmount > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">التوزيعات المُنفّذة</TableCell>
                  <TableCell className="text-left font-medium text-success">{fmt(distributionsAmount)} ر.س</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-accent/10">
                <TableCell className="font-bold">إجمالي حقوق الملكية</TableCell>
                <TableCell className="text-left font-bold">{fmt(totalEquity + distributionsAmount)} ر.س</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* ملخص التوازن */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t-2 border-border">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground">صافي بعد المصروفات</p>
            <p className="text-lg font-bold">{fmt(netAfterExpenses)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground">صافي بعد الضريبة</p>
            <p className="text-lg font-bold">{fmt(netAfterVat)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground">صافي بعد الزكاة</p>
            <p className="text-lg font-bold">{fmt(netAfterZakat)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/10">
            <p className="text-xs text-muted-foreground">المتاح للتوزيع</p>
            <p className="text-lg font-bold text-success">{fmt(availableAmount)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceSheetReport;
