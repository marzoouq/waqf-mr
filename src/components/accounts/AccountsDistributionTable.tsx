import { fmt } from '@/utils/format/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PieChart, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** ملخص التوزيع — كائن واحد بدلاً من 25+ prop */
export interface DistributionSummary {
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
}

interface AccountsDistributionTableProps {
  summary: DistributionSummary;
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

const AccountsDistributionTable = ({ summary: s, isClosed = false }: AccountsDistributionTableProps) => {

  // بناء قائمة البنود
  const items: DistItem[] = [
    { label: 'رقبة الوقف المرحلة من العام السابق', amount: fmt(s.waqfCorpusPrevious), amountClass: 'text-success', show: s.waqfCorpusPrevious > 0 },
    { label: 'إجمالي الدخل', amount: fmt(s.totalIncome), amountClass: 'text-success', highlight: 'subtle', bold: true },
    { label: 'الإجمالي الشامل', amount: fmt(s.grandTotal), amountClass: 'text-success', highlight: 'subtle', bold: true, show: s.waqfCorpusPrevious > 0 },
    { label: '(-) المصروفات التشغيلية', amount: fmt(s.totalExpenses), amountClass: 'text-destructive' },
    { label: 'الصافي بعد المصاريف', amount: fmt(s.netAfterExpenses), highlight: 'subtle', bold: true },
    { label: '(-) ضريبة القيمة المضافة', amount: fmt(s.manualVat), amountClass: 'text-destructive' },
    { label: 'الصافي بعد الضريبة', amount: fmt(s.netAfterVat), highlight: 'subtle', bold: true },
    { label: '(-) الزكاة', amount: fmt(s.zakatAmount), amountClass: 'text-destructive' },
    { label: 'الصافي بعد الزكاة', amount: fmt(s.netAfterZakat), highlight: 'subtle', bold: true },
    { label: '(-) حصة الناظر', pct: `${s.adminPercent}%`, amount: fmt(s.adminShare) },
    { label: '(-) حصة الواقف', pct: `${s.waqifPercent}%`, amount: fmt(s.waqifShare) },
    { label: 'ريع الوقف (الإجمالي القابل للتوزيع)', amount: fmt(s.waqfRevenue), amountClass: 'text-primary', highlight: 'primary', bold: true },
    { label: '(-) رقبة الوقف للعام الحالي', amount: fmt(s.waqfCorpusManual) },
    { label: 'المبلغ المتاح', amount: fmt(s.availableAmount), amountClass: 'text-primary', highlight: 'primary', bold: true },
    { label: '(-) التوزيعات', amount: fmt(s.manualDistributions) },
    { label: 'الرصيد المتبقي', amount: fmt(s.remainingBalance), amountClass: s.remainingBalance >= 0 ? 'text-success' : 'text-destructive', highlight: 'accent', bold: true },
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
              {s.waqfCorpusPrevious > 0 && (
                <TableRow>
                  <TableCell className="font-medium">رقبة الوقف المرحلة من العام السابق</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold text-success">{fmt(s.waqfCorpusPrevious)}</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-success/10">
                <TableCell className="font-medium">إجمالي الدخل</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold text-success">{fmt(s.totalIncome)}</TableCell>
              </TableRow>
              {s.waqfCorpusPrevious > 0 && (
                <TableRow className="bg-success/20 font-semibold">
                  <TableCell className="font-bold">الإجمالي الشامل</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold text-success">{fmt(s.grandTotal)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-medium">(-) المصروفات التشغيلية</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(s.totalExpenses)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد المصاريف</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(s.netAfterExpenses)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) ضريبة القيمة المضافة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(s.manualVat)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد الضريبة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(s.netAfterVat)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) الزكاة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-destructive">{fmt(s.zakatAmount)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="font-bold">الصافي بعد الزكاة</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="font-bold">{fmt(s.netAfterZakat)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) حصة الناظر</TableCell>
                <TableCell>{s.adminPercent}%</TableCell>
                <TableCell>{fmt(s.adminShare)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) حصة الواقف</TableCell>
                <TableCell>{s.waqifPercent}%</TableCell>
                <TableCell>{fmt(s.waqifShare)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-primary font-bold">{fmt(s.waqfRevenue)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) رقبة الوقف للعام الحالي</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{fmt(s.waqfCorpusManual)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/5 font-bold">
                <TableCell className="font-bold">المبلغ المتاح</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-primary font-bold">{fmt(s.availableAmount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">(-) التوزيعات</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{fmt(s.manualDistributions)}</TableCell>
              </TableRow>
              <TableRow className="bg-accent/20 font-bold">
                <TableCell className="font-bold text-lg">الرصيد المتبقي</TableCell>
                <TableCell>-</TableCell>
                <TableCell className={`font-bold text-lg ${s.remainingBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(s.remainingBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountsDistributionTable;
