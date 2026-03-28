/**
 * بطاقات ملخص الترحيلات
 */
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingDown, CheckCircle, Clock } from 'lucide-react';
import { fmt } from '@/utils/format';

interface Props {
  totalPaidAdvances: number;
  activeBalance: number;
  totalSettled: number;
  paidAdvancesCount: number;
}

const CarryforwardSummaryCards = ({ totalPaidAdvances, activeBalance, totalSettled, paidAdvancesCount }: Props) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">إجمالي السُلف المصروفة</p>
          <p className="text-lg font-bold">{fmt(totalPaidAdvances)} ر.س</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">رصيد مرحّل نشط</p>
          <p className="text-lg font-bold">{fmt(activeBalance)} ر.س</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">إجمالي المُسوّى</p>
          <p className="text-lg font-bold">{fmt(totalSettled)} ر.س</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-warning" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">عدد السُلف المصروفة</p>
          <p className="text-lg font-bold">{paidAdvancesCount}</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default CarryforwardSummaryCards;
