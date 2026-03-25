import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, CheckCircle, Clock } from 'lucide-react';
import { fmt } from '@/utils/format';

interface Props {
  totalIncome: number;
  totalExpenses: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  waqfCorpusPrevious: number;
}

const DisclosureSummaryCards = ({ totalIncome, totalExpenses, myShare, totalReceived, pendingAmount, waqfCorpusPrevious }: Props) => (
  <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Card className="shadow-xs bg-success/10 border-success/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الإيرادات</p>
            <p className="text-lg sm:text-2xl font-bold text-success truncate">+{fmt(totalIncome)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {waqfCorpusPrevious > 0 && (
      <Card className="shadow-xs bg-info/10 border-info/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-info/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">مبلغ مرحّل من العام السابق</p>
              <p className="text-lg sm:text-2xl font-bold text-info truncate">+{fmt(waqfCorpusPrevious)} ر.س</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    <Card className="shadow-xs bg-destructive/10 border-destructive/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p>
            <p className="text-lg sm:text-2xl font-bold text-destructive truncate">-{fmt(totalExpenses)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-xs gradient-primary text-primary-foreground">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-primary-foreground/90">حصتي المستحقة</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{fmt(myShare)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-xs bg-success/10 border-success/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستلمة</p>
            <p className="text-lg sm:text-2xl font-bold text-success truncate">{fmt(totalReceived)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {pendingAmount > 0 && (
      <Card className="shadow-xs bg-warning/10 border-warning/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">مبلغ معلق</p>
              <p className="text-lg sm:text-2xl font-bold text-warning truncate">{fmt(pendingAmount)} ر.س</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

export default DisclosureSummaryCards;
