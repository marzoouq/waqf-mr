/**
 * مكون قائمة التذاكر — عرض الجدول والبطاقات
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Eye, Star } from 'lucide-react';
import type { SupportTicket } from '@/hooks/data/support/useSupportTickets';
import { fmtDate } from '@/utils/format/format';
import { STATUS_MAP } from './supportConstants';

interface TicketListProps {
  tickets: SupportTicket[];
  onSelect: (ticket: SupportTicket) => void;
}

const TicketList = ({ tickets, onSelect }: TicketListProps) => {
  return (
    <>
      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {tickets.map(ticket => {
          const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.open!;
          const Icon = s.icon;
          return (
            <Card key={ticket.id} className="shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{ticket.ticket_number}</p>
                  </div>
                  <Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">التاريخ</p>
                    <p className="text-sm">{fmtDate(ticket.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">التقييم</p>
                    {ticket.rating ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => onSelect(ticket)}>
                  <Eye className="w-3 h-3 ml-1" />عرض
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">الرقم</TableHead>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">التقييم</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map(ticket => {
              const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.open!;
              const Icon = s.icon;
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell>
                    <Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.rating ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    ) : (ticket.status === 'resolved' || ticket.status === 'closed') ? (
                      <span className="text-xs text-muted-foreground">بانتظار التقييم</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{fmtDate(ticket.created_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onSelect(ticket)}>
                      <Eye className="w-3 h-3 ml-1" />عرض
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default TicketList;
