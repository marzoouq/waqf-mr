import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import { fmt } from '@/utils/format';

interface Distribution {
  id: string;
  amount: number;
  date: string;
  status: string;
}

interface BeneficiaryRecentDistributionsProps {
  distributions: Distribution[];
}

const BeneficiaryRecentDistributions = ({ distributions }: BeneficiaryRecentDistributionsProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Wallet className="w-5 h-5" />
          آخر التوزيعات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {distributions.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">لا توجد توزيعات مسجلة</p>
        ) : (
          <div className="space-y-3">
            {distributions.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{fmt(Number(d.amount))} ر.س</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(d.date).toLocaleDateString('ar-SA')}</p>
                </div>
                <Badge variant={d.status === 'paid' ? 'default' : 'secondary'} className="text-[11px]">
                  {d.status === 'paid' ? 'مدفوع' : 'معلق'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BeneficiaryRecentDistributions;
