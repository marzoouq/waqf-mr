import { fmt } from '@/utils/format';
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

// بند واحد في جدول التوزيع
interface DistItem {
  label: string;
  pct?: string;
  amount: string;
  amountClass?: string;
  highlight?: 'subtle' | 'primary' | 'accent';
  bold?: boolean;
  show?: boolean;
}

const AccountsDistributionTable = ({
  waqfCorpusPrevious, totalIncome, grandTotal, totalExpenses,
  netAfterExpenses, manualVat, netAfterVat, zakatAmount, netAfterZakat,
  adminPercent, adminShare, waqifPercent, waqifShare,
  waqfRevenue, waqfCorpusManual, availableAmount,
  manualDistributions, remainingBalance,
  isClosed = false,
}: AccountsDistributionTableProps) => {

  // بناء قائمة البنود
  const items: DistItem[] = [
    { label: 'رقبة الوقف المرحلة من العام السابق', amount: fmt(waqfCorpusPrevious), amountClass: 'text-success', show: waqfCorpusPrevious > 0 },
    { label: 'إجمالي الدخل', amount: fmt(totalIncome), amountClass: 'text-success', highlight: 'subtle', bold: true },
    { label: 'الإجمالي الشامل', amount: fmt(grandTotal), amountClass: 'text-success', highlight: 'subtle', bold: true, show: waqfCorpusPrevious > 0 },
    { label: '(-) المصروفات التشغيلية', amount: fmt(totalExpenses), amountClass: 'text-destructive' },
    { label: 'الصافي بعد المصاريف', amount: fmt(netAfterExpenses), highlight: 'subtle', bold: true },
    { label: '(-) ضريبة القيمة المضافة', amount: fmt(manualVat), amountClass: 'text-destructive' },
    { label: 'الصافي بعد الضريبة', amount: fmt(netAfterVat), highlight: 'subtle', bold: true },
    { label: '(-) الزكاة', amount: fmt(zakatAmount), amountClass: 'text-destructive' },
    { label: 'الصافي بعد الزكاة', amount: fmt(netAfterZakat), highlight: 'subtle', bold: true },
    { label: '(-) حصة الناظر', pct: `${adminPercent}%`, amount: fmt(adminShare) },
    { label: '(-) حصة الواقف', pct: `${waqifPercent}%`, amount: fmt(waqifShare) },
    { label: 'ريع الوقف (الإجمالي القابل للتوزيع)', amount: fmt(waqfRevenue), amountClass: 'text-primary', highlight: 'primary', bold: true },
    { label: '(-) رقبة الوقف للعام الحالي', amount: fmt(waqfCorpusManual) },
    { label: 'المبلغ المتاح', amount: fmt(availableAmount), amountClass: 'text-primary', highlight: 'primary', bold: true },
    { label: '(-) التوزيعات', amount: fmt(manualDistributions) },
    { label: 'الرصيد المتبقي', amount: fmt(remainingBalance), amountClass: remainingBalance >= 0 ? 'text-success' : 'text-destructive', highlight: 'accent', bold: true },
  ];

  const visibleItems = items.filter(i => i.show !== false);

  // CSS helpers
  const highlightBg = (h?: string) => {
    if (h === 'subtle') return 'bg-muted/30';
    if (h === 'primary') return 'bg-primary/10';
    if (h === 'accent') return 'bg-accent/20';
    return '';
  };

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

        {/* Mobile: stacked list */}
        <div className="space-y-1 md:hidden">
          {visibleItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg ${highlightBg(item.highlight)} ${item.bold ? 'font-bold' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <span className={`text-sm ${item.bold ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {item.pct && <span className="text-xs text-muted-foreground mr-1">({item.pct})</span>}
              </div>
              <span className={`text-sm font-bold whitespace-nowrap ${item.amountClass || ''} ${item.highlight === 'accent' ? 'text-base' : ''}`}>
                {item.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
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
                  <TableCell className="font-bold text-success">{fmt(waqfCorpusPrevious)}</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-success/10">
                <TableCell className="font-medium">إجمالي الدخل</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold text-success">{fmt(totalIncome)}</TableCell>
              </TableRow>
              {waqfCorpusPrevious > 0 && (
                <TableRow className="bg-success/20 font-semibold">
                  <TableCell className="font-bold">الإجمالي الشامل</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold text-success">{fmt(grandTotal)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-medium">(-) المصروفات التشغيلية</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(totalExpenses)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد المصاريف</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(netAfterExpenses)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) ضريبة القيمة المضافة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(manualVat)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد الضريبة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(netAfterVat)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) الزكاة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(zakatAmount)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد الزكاة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(netAfterZakat)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) حصة الناظر</TableCell>
                <TableCell>{adminPercent}%</TableCell>
                <TableCell>{fmt(adminShare)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) حصة الواقف</TableCell>
                <TableCell>{waqifPercent}%</TableCell>
                <TableCell>{fmt(waqifShare)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-primary font-bold">{fmt(waqfRevenue)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) رقبة الوقف للعام الحالي</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{fmt(waqfCorpusManual)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/5 font-bold">
                <TableCell className="font-bold">المبلغ المتاح</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-primary font-bold">{fmt(availableAmount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) التوزيعات</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{fmt(manualDistributions)}</TableCell>
              </TableRow>
              <TableRow className="bg-accent/20 font-bold">
                <TableCell className="font-bold text-lg">الرصيد المتبقي</TableCell>
                <TableCell>-</TableCell>
                <TableCell className={`font-bold text-lg ${remainingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(remainingBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountsDistributionTable;
