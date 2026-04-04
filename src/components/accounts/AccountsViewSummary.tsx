/**
 * بطاقات ملخص الحسابات الختامية — صفحة المستفيد
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { fmt } from '@/utils/format/format';

interface AccountsViewSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netAfterZakat: number;
  availableAmount: number;
  myShare: number;
}

export default function AccountsViewSummary({ totalIncome, totalExpenses, netAfterZakat, availableAmount, myShare }: AccountsViewSummaryProps) {
  return (
    <Card className="shadow-sm gradient-hero text-primary-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
          ملخص الحسابات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-[11px] sm:text-sm text-primary-foreground/90">إجمالي الدخل</p>
            <p className="text-sm sm:text-xl font-bold truncate">{fmt(totalIncome)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-[11px] sm:text-sm text-primary-foreground/90">إجمالي المصروفات</p>
            <p className="text-sm sm:text-xl font-bold truncate">{fmt(totalExpenses)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-[11px] sm:text-sm text-primary-foreground/90">الصافي بعد الزكاة</p>
            <p className="text-sm sm:text-xl font-bold truncate">{fmt(netAfterZakat)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-[11px] sm:text-sm text-primary-foreground/90">الإجمالي القابل للتوزيع</p>
            <p className="text-sm sm:text-xl font-bold truncate">{fmt(availableAmount)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg col-span-2">
            <p className="text-[11px] sm:text-sm text-primary-foreground/90">حصتي المستحقة</p>
            <p className="text-sm sm:text-xl font-bold truncate">{fmt(myShare)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
