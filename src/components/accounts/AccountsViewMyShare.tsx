/**
 * بطاقة حصتي المستحقة — صفحة المستفيد
 */
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { fmt } from '@/utils/format';

interface AccountsViewMyShareProps {
  myShare: number;
}

export default function AccountsViewMyShare({ myShare }: AccountsViewMyShareProps) {
  return (
    <Card className="shadow-sm bg-primary/10 border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة</p>
            <p className="text-xl sm:text-3xl font-bold text-primary truncate">{fmt(myShare)} ر.س</p>
          </div>
          <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-primary/30 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
