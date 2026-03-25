/**
 * بطاقات ملخص الحصة — نسبة، مستحقة، مستلمة، معلقة، سُلف
 */
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Clock, CheckCircle, Banknote, PieChart } from 'lucide-react';
import { fmt } from '@/utils/format';

interface Props {
  sharePercentage: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  paidAdvancesTotal: number;
  isClosed: boolean;
  advancesEnabled: boolean;
}

const MyShareSummaryCards = ({
  sharePercentage, myShare, totalReceived, pendingAmount,
  paidAdvancesTotal, isClosed, advancesEnabled,
}: Props) => (
  <div className={`grid grid-cols-2 ${advancesEnabled ? 'lg:grid-cols-5' : 'sm:grid-cols-4'} gap-3 sm:gap-4`}>
    {/* نسبة الحصة */}
    <Card className="shadow-sm border-primary/20">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <PieChart className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">نسبة الحصة</p>
            <p className="text-base sm:text-2xl font-bold truncate">{sharePercentage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* الحصة المستحقة */}
    <Card className="shadow-sm gradient-primary text-primary-foreground">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الحصة المستحقة</p>
            {!isClosed ? (
              <p className="text-sm font-medium text-primary-foreground/70">تُحسب عند إغلاق السنة</p>
            ) : (
              <p className="text-base sm:text-2xl font-bold truncate">{fmt(myShare)} ر.س</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* المبالغ المستلمة */}
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-success/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">المبالغ المستلمة</p>
            <p className="text-base sm:text-2xl font-bold text-success truncate">{fmt(totalReceived)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* المبالغ المعلقة */}
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-warning/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">المبالغ المعلقة</p>
            <p className="text-base sm:text-2xl font-bold text-warning truncate">{fmt(pendingAmount)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* السُلف المصروفة */}
    {advancesEnabled && (
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">السُلف المصروفة</p>
              <p className="text-base sm:text-2xl font-bold text-accent-foreground truncate">{fmt(paidAdvancesTotal)} ر.س</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

export default MyShareSummaryCards;
