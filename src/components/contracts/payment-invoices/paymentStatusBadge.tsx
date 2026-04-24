/**
 * PaymentStatusBadge — شارة حالة فاتورة الدفعة (موحَّدة بين Mobile + Desktop)
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: string;
}

export const PaymentStatusBadge = ({ status }: PaymentStatusBadgeProps) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مسددة</Badge>;
    case 'overdue':
      return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخرة</Badge>;
    case 'pending':
      return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
    case 'partially_paid':
      return <Badge className="bg-accent/20 text-accent-foreground border-0 gap-1"><Clock className="w-3 h-3" />جزئية</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

export default PaymentStatusBadge;
