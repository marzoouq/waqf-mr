/**
 * AdvanceStatusBadge — شارة حالة طلب السلفة
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Banknote, Clock } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-warning/20 text-warning', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-status-approved/20 text-status-approved-foreground', icon: CheckCircle },
  paid: { label: 'مصروف', color: 'bg-success/20 text-success', icon: Banknote },
  rejected: { label: 'مرفوض', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

interface Props { status: string }

const AdvanceStatusBadge = ({ status }: Props) => {
  const s = statusMap[status] ?? statusMap.pending!;
  const Icon = s.icon;
  return <Badge className={`${s.color} hover:${s.color}`}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
};

export default AdvanceStatusBadge;
