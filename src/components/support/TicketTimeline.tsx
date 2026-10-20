/**
 * الخط الزمني للتذكرة: إنشاء ← قيد المعالجة ← تم الحل ← مغلقة.
 */
import { STATUS_MAP } from '@/constants/support';
import { fmtDateTime } from '@/utils/format/format';
import type { TicketEvent } from '@/types/support';

const label = (e: TicketEvent) => {
  if (e.event_type === 'created') return 'أُنشئت التذكرة';
  if (e.event_type === 'reopen_reason') return 'أعاد المرسل فتح التذكرة';
  return STATUS_MAP[e.to_status ?? '']?.label ?? e.to_status ?? '';
};

const TicketTimeline = ({ events }: { events: TicketEvent[] }) => {
  if (events.length === 0) return null;
  return (
    <ol className="border-s-2 border-border ps-3 space-y-1.5 text-xs" aria-label="سجل الإجراءات">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -start-[17px] top-1 w-2 h-2 rounded-full bg-primary" />
          <span className="font-medium">{label(e)}</span>
          <span className="text-muted-foreground"> — {fmtDateTime(e.created_at)}</span>
          {e.note && <p className="text-muted-foreground">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
};

export default TicketTimeline;
