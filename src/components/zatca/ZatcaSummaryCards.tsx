/**
 * بطاقات ملخص ZATCA — عدد المُرسلة، المعلقة، المرفوضة، حالة الشهادة
 */
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle, ShieldCheck } from 'lucide-react';

interface ZatcaSummaryCardsProps {
  submitted: number;
  pending: number;
  rejected: number;
  activeCertType: 'production' | 'compliance' | null;
}

export default function ZatcaSummaryCards({ submitted, pending, rejected, activeCertType }: ZatcaSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{submitted}</p>
          <p className="text-sm text-muted-foreground">مُرسلة / مُعتمدة</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <Clock className="w-8 h-8 mx-auto text-accent-foreground mb-2" />
          <p className="text-2xl font-bold text-foreground">{pending}</p>
          <p className="text-sm text-muted-foreground">لم تُرسل</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <XCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
          <p className="text-2xl font-bold text-foreground">{rejected}</p>
          <p className="text-sm text-muted-foreground">مرفوضة</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-sm font-bold text-foreground">
            {activeCertType === 'production' ? 'إنتاج' : activeCertType === 'compliance' ? 'امتثال' : 'غير مسجّل'}
          </p>
          <p className="text-sm text-muted-foreground">حالة الشهادة</p>
        </CardContent>
      </Card>
    </div>
  );
}
