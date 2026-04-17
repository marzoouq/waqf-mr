/**
 * مؤشر مستوى الخدمة (SLA)
 */
import type { SupportTicket } from '@/hooks/data/support/useSupportTickets';
import { SLA_HOURS } from '@/constants/support';

export default function SlaIndicator({ ticket }: { ticket: SupportTicket }) {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return <span className="text-xs text-success">✓ مُغلق</span>;
  }
  const slaHours = SLA_HOURS[ticket.priority] ?? 24;
  const deadline = new Date(ticket.created_at).getTime() + slaHours * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    const hours = Math.floor(Math.abs(remaining) / (1000 * 60 * 60));
    return <span className="text-xs text-destructive font-medium">⏰ متأخر {hours > 0 ? `${hours} س` : 'الآن'}</span>;
  }
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
  const minsLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = remaining < 2 * 60 * 60 * 1000;
  return (
    <span className={`text-xs font-medium ${isUrgent ? 'text-warning' : 'text-muted-foreground'}`}>
      {hoursLeft > 0 ? `${hoursLeft} س` : ''} {minsLeft} د
    </span>
  );
}
