/**
 * R-4: تقرير تقدير الزكاة التفصيلي
 * يعرض تفاصيل حساب الزكاة الشرعية على ريع الوقف
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fmt } from '@/utils/format';

interface ZakatEstimationReportProps {
  totalIncome: number;
  totalExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  fiscalYearLabel?: string;
}

/** نسبة الزكاة الشرعية (2.5%) */
const ZAKAT_RATE = 0.025;

/** حد النصاب التقريبي بالريال (85 جرام ذهب × سعر تقريبي) */
const NISAB_APPROX = 85 * 300; // ~25,500 ر.س تقريبي

const ZakatEstimationReport = ({
  totalIncome,
  totalExpenses,
  vatAmount,
  netAfterVat,
  zakatAmount,
  netAfterZakat,
  waqfCorpusPrevious,
  grandTotal,
  fiscalYearLabel,
}: ZakatEstimationReportProps) => {
  // الوعاء الزكوي = صافي ما بعد الضريبة (netAfterVat)
  const zakatBase = netAfterVat;
  const calculatedZakat = Math.max(0, zakatBase * ZAKAT_RATE);
  const meetsNisab = zakatBase >= NISAB_APPROX;

  const steps = [
    { label: 'إجمالي الإيرادات', value: totalIncome, type: 'add' as const },
    ...(waqfCorpusPrevious > 0
      ? [{ label: 'رقبة الوقف المرحّلة', value: waqfCorpusPrevious, type: 'add' as const }]
      : []),
    { label: 'الإجمالي الشامل', value: grandTotal, type: 'subtotal' as const },
    { label: '(-) إجمالي المصروفات', value: totalExpenses, type: 'subtract' as const },
    { label: '(-) ضريبة القيمة المضافة', value: vatAmount, type: 'subtract' as const },
    { label: 'الوعاء الزكوي (صافي ما بعد الضريبة)', value: netAfterVat, type: 'subtotal' as const },
    { label: `الزكاة المقدّرة (${(ZAKAT_RATE * 100).toFixed(1)}%)`, value: calculatedZakat, type: 'zakat' as const },
    { label: 'الزكاة المسجّلة فعلاً', value: zakatAmount, type: 'recorded' as const },
    { label: 'الصافي بعد الزكاة', value: netAfterZakat, type: 'result' as const },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          تقدير الزكاة التفصيلي
          {fiscalYearLabel && <Badge variant="secondary" className="text-xs">{fiscalYearLabel}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* تنبيه النصاب */}
        <Alert className={meetsNisab ? 'border-success/50' : 'border-warning/50'}>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {meetsNisab
              ? `الوعاء الزكوي (${fmt(zakatBase)} ر.س) يتجاوز النصاب التقريبي (${fmt(NISAB_APPROX)} ر.س) — الزكاة واجبة.`
              : `الوعاء الزكوي (${fmt(zakatBase)} ر.س) أقل من النصاب التقريبي (${fmt(NISAB_APPROX)} ر.س) — قد لا تجب الزكاة. يُرجع للمختص الشرعي.`}
          </AlertDescription>
        </Alert>

        {/* عرض بنود الجوال */}
        <div className="md:hidden space-y-1.5">
          {steps.map((step, i) => {
            const isSubtotal = step.type === 'subtotal';
            const isZakat = step.type === 'zakat';
            const isResult = step.type === 'result';
            const isRecorded = step.type === 'recorded';
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-2.5 rounded-lg ${
                  isResult ? 'bg-primary/10 border-2 border-primary/30' :
                  isSubtotal ? 'bg-muted/30' :
                  isZakat ? 'bg-warning/10' :
                  isRecorded ? 'bg-success/10' : 'bg-background'
                }`}
              >
                <span className={`text-sm ${isSubtotal || isResult ? 'font-bold' : ''}`}>{step.label}</span>
                <span className={`tabular-nums text-sm font-medium ${
                  step.type === 'subtract' ? 'text-destructive' :
                  step.type === 'add' ? 'text-success' :
                  isZakat ? 'text-warning font-bold' :
                  isResult ? 'text-primary font-bold' :
                  isRecorded ? 'text-success' : 'font-semibold'
                }`}>
                  {step.type === 'subtract' ? '-' : step.type === 'add' ? '+' : ''}
                  {fmtInt(step.value)}
                </span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground text-center pt-2">
            * النصاب التقريبي يعتمد على سعر الذهب (85 جرام × 300 ر.س). يُرجى مراجعة المختص الشرعي للتحقق.
          </p>
        </div>

        {/* جدول الخطوات للشاشات الكبيرة */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">البند</TableHead>
                <TableHead className="text-right w-[180px]">المبلغ (ر.س)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step, i) => {
                const isSubtotal = step.type === 'subtotal';
                const isZakat = step.type === 'zakat';
                const isResult = step.type === 'result';
                const isRecorded = step.type === 'recorded';
                return (
                  <TableRow
                    key={i}
                    className={
                      isResult ? 'bg-primary/10 font-bold border-t-2 border-primary/30' :
                      isSubtotal ? 'bg-muted/30 font-semibold' :
                      isZakat ? 'bg-warning/10' :
                      isRecorded ? 'bg-success/10' : ''
                    }
                  >
                    <TableCell className={isSubtotal || isResult ? 'font-bold' : ''}>
                      {step.label}
                    </TableCell>
                    <TableCell className={`tabular-nums ${
                      step.type === 'subtract' ? 'text-destructive' :
                      step.type === 'add' ? 'text-success' :
                      isZakat ? 'text-warning font-bold' :
                      isResult ? 'text-primary font-bold' :
                      isRecorded ? 'text-success font-medium' :
                      'font-semibold'
                    }`}>
                      {step.type === 'subtract' ? '-' : step.type === 'add' ? '+' : ''}
                      {step.value.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground text-center py-3">
                  * النصاب التقريبي يعتمد على سعر الذهب (85 جرام × 300 ر.س). يُرجى مراجعة المختص الشرعي للتحقق.
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* فرق الزكاة */}
        {Math.abs(calculatedZakat - zakatAmount) > 1 && zakatAmount > 0 && (
          <Alert className="border-warning/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              يوجد فرق بين الزكاة المقدّرة ({fmt(calculatedZakat)} ر.س) والمسجّلة ({fmt(zakatAmount)} ر.س) بمقدار {fmt(Math.abs(calculatedZakat - zakatAmount))} ر.س. يُرجى المراجعة.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ZakatEstimationReport;
