/**
 * بطاقات إحصاء المراسلات (الإجمالي، المفتوحة، تذاكر الدعم)
 */
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, MailOpen, LifeBuoy } from 'lucide-react';
import type { Conversation } from '@/types';

type Props = { conversations: Conversation[] };

const MessagesStatsCards = ({ conversations }: Props) => {
  const total = conversations.length;
  const open = conversations.filter((c) => c.status === 'open').length;
  const support = conversations.filter((c) => c.type === 'support').length;

  const items = [
    { label: 'إجمالي المحادثات', value: total, icon: MessageSquare, color: 'text-primary' },
    { label: 'المفتوحة', value: open, icon: MailOpen, color: 'text-success' },
    { label: 'تذاكر الدعم', value: support, icon: LifeBuoy, color: 'text-warning' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
      {items.map((it) => (
        <Card key={it.label} className="shadow-sm">
          <CardContent className="p-2 sm:p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50 shrink-0">
              <it.icon className={`w-4 h-4 ${it.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{it.label}</p>
              <p className="text-sm sm:text-lg font-bold tabular-nums">{it.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MessagesStatsCards;
