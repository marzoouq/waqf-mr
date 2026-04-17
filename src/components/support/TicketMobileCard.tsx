/**
 * بطاقة تذكرة دعم — عرض الموبايل
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Star } from 'lucide-react';
import type { SupportTicket } from '@/hooks/data/support/useSupportTickets';
import { fmtDate } from '@/utils/format/format';
import { STATUS_MAP, PRIORITY_MAP, CATEGORY_MAP } from '@/constants/support';
import SlaIndicator from './SlaIndicator';

interface TicketMobileCardProps {
  ticket: SupportTicket;
  onSelect: (t: SupportTicket) => void;
}

export default function TicketMobileCard({ ticket, onSelect }: TicketMobileCardProps) {
  const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.open!;
  const p = PRIORITY_MAP[ticket.priority] ?? PRIORITY_MAP.medium!;
  const Icon = s.icon;
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-2">{ticket.title}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{ticket.ticket_number}</p>
        </div>
        <Badge className={s.color + ' shrink-0 text-[11px]'}>
          <Icon className="w-3 h-3 ml-0.5" />{s.label}
        </Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <Badge className={p.color + ' text-[11px]'}>{p.label}</Badge>
        <span className="text-muted-foreground">{CATEGORY_MAP[ticket.category] || ticket.category}</span>
        <span className="text-muted-foreground">•</span>
        <SlaIndicator ticket={ticket} />
        {ticket.rating && (
          <>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-3 h-3 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} aria-label={`نجمة ${i} من 5`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{fmtDate(ticket.created_at)}</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSelect(ticket)}>
          <Eye className="w-3 h-3 ml-1" />عرض
        </Button>
      </div>
    </div>
  );
}
