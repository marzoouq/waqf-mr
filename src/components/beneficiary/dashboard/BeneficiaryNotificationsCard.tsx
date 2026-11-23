import { fmtDate } from '@/utils/format/format';
import { NOTIFICATIONS_COPY } from '@/constants/beneficiaryCopy';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import SectionHeading from '@/components/layout/SectionHeading';
import { cn } from '@/lib/cn';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface BeneficiaryNotificationsCardProps {
  notifications: Notification[];
  unreadCount: number;
}

const BeneficiaryNotificationsCard = ({ notifications, unreadCount }: BeneficiaryNotificationsCardProps) => {
  // CR-03: تمييز الحالتين الفارغتين
  const emptyText = notifications.length === 0 ? NOTIFICATIONS_COPY.emptyAll : NOTIFICATIONS_COPY.emptyUnread;
  const Icon = DOMAIN_ICONS.notifications;

  return (
    <section>
      <SectionHeading
        title={NOTIFICATIONS_COPY.cardTitle}
        count={unreadCount}
        action={{ label: 'عرض الكل', to: '/beneficiary/notifications' }}
      />
      <div className="rounded-2xl border bg-card shadow-sm divide-y">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">{emptyText}</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3.5">
              <span className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {!n.is_read && <span className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-card" aria-label={NOTIFICATIONS_COPY.unreadBadge} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">{fmtDate(n.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default BeneficiaryNotificationsCard;
