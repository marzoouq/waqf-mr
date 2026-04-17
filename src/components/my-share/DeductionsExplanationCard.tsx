/**
 * بطاقة تفسير الخصومات للمستفيد — تظهر عند وجود سُلف أو فروق مرحَّلة
 */
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { fmt } from '@/utils/format/format';

interface Props {
  myShare: number;
  paidAdvancesTotal: number;
  carryforwardBalance: number;
  isClosed: boolean;
}

const DeductionsExplanationCard = ({ myShare, paidAdvancesTotal, carryforwardBalance, isClosed }: Props) => {
  const totalDeductions = paidAdvancesTotal + carryforwardBalance;
  if (totalDeductions <= 0 || !isClosed) return null;

  const netAfter = Math.max(0, myShare - totalDeductions);
  const isZero = netAfter === 0;

  return (
    <Card className={`shadow-sm ${isZero ? 'border-info/40 bg-info/5' : 'border-muted bg-muted/20'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isZero ? 'text-info' : 'text-muted-foreground'}`} />
          <div className="space-y-2">
            <p className="font-bold text-sm">
              {isZero ? 'حصتك الصافية صفر بسبب الخصومات' : 'تفسير خصومات حصتك'}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>الحصة الإجمالية: <span className="font-semibold text-foreground">{fmt(myShare)} ر.س</span></li>
              {paidAdvancesTotal > 0 && (
                <li>− سُلف مدفوعة: <span className="font-semibold text-warning">{fmt(paidAdvancesTotal)} ر.س</span></li>
              )}
              {carryforwardBalance > 0 && (
                <li>− فروق مرحَّلة: <span className="font-semibold text-warning">{fmt(carryforwardBalance)} ر.س</span></li>
              )}
              <li className="pt-1 border-t border-border/50">
                = صافي مستحق: <span className={`font-bold ${isZero ? 'text-info' : 'text-success'}`}>{fmt(netAfter)} ر.س</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeductionsExplanationCard;
