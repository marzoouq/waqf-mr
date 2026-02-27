import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PieChart, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccountsDistributionTableProps {
  waqfCorpusPrevious: number;
  totalIncome: number;
  grandTotal: number;
  totalExpenses: number;
  netAfterExpenses: number;
  manualVat: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminPercent: number;
  adminShare: number;
  waqifPercent: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  manualDistributions: number;
  remainingBalance: number;
  /** Whether the fiscal year is closed */
  isClosed?: boolean;
}

const AccountsDistributionTable = ({
  waqfCorpusPrevious, totalIncome, grandTotal, totalExpenses,
  netAfterExpenses, manualVat, netAfterVat, zakatAmount, netAfterZakat,
  adminPercent, adminShare, waqifPercent, waqifShare,
  waqfRevenue, waqfCorpusManual, availableAmount,
  manualDistributions, remainingBalance,
  isClosed = true,
}: AccountsDistributionTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          التوزيع والحصص
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isClosed && (
          <Alert className="mb-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              هذه أرقام تقديرية — يتم اعتمادها رسمياً عند إقفال السنة المالية
            </AlertDescription>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">البند</TableHead>
              <TableHead className="text-right">النسبة</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waqfCorpusPrevious > 0 && (
              <TableRow>
                <TableCell className="font-medium">رقبة الوقف المرحلة من العام السابق</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold text-success">{waqfCorpusPrevious.toLocaleString()}</TableCell>
              </TableRow>
            )}
            <TableRow className="bg-success/10">
              <TableCell className="font-medium">إجمالي الدخل</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="font-bold text-success">{totalIncome.toLocaleString()}</TableCell>
            </TableRow>
            {waqfCorpusPrevious > 0 && (
              <TableRow className="bg-success/20 font-semibold">
                <TableCell className="font-bold">الإجمالي الشامل</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold text-success">{grandTotal.toLocaleString()}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="font-medium">(-) المصروفات التشغيلية</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-destructive">{totalExpenses.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="font-bold">الصافي بعد المصاريف</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="font-bold">{netAfterExpenses.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) ضريبة القيمة المضافة</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-destructive">{manualVat.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="font-bold">الصافي بعد الضريبة</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="font-bold">{netAfterVat.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) الزكاة</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-destructive">{zakatAmount.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="font-bold">الصافي بعد الزكاة</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="font-bold">{netAfterZakat.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) حصة الناظر</TableCell>
              <TableCell>{adminPercent}%</TableCell>
              <TableCell>{adminShare.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) حصة الواقف</TableCell>
              <TableCell>{waqifPercent}%</TableCell>
              <TableCell>{waqifShare.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-primary/10 font-bold">
              <TableCell className="font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-primary font-bold">{waqfRevenue.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) رقبة الوقف للعام الحالي</TableCell>
              <TableCell>-</TableCell>
              <TableCell>{waqfCorpusManual.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-primary/5 font-bold">
              <TableCell className="font-bold">المبلغ المتاح</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-primary font-bold">{availableAmount.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">(-) التوزيعات</TableCell>
              <TableCell>-</TableCell>
              <TableCell>{manualDistributions.toLocaleString()}</TableCell>
            </TableRow>
            <TableRow className="bg-accent/20 font-bold">
              <TableCell className="font-bold text-lg">الرصيد المتبقي</TableCell>
              <TableCell>-</TableCell>
              <TableCell className={`font-bold text-lg ${remainingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{remainingBalance.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AccountsDistributionTable;
