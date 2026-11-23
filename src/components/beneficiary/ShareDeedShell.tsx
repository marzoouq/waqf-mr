/**
 * إطار «صك الحصة» — البطاقة الوقفية الرئيسية لحصة المستفيد (لوحة المستفيد وصفحة حصتي).
 * presentational: المبلغ يُعرض كما يُمرَّر.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from '@/components/common';

interface ShareDeedShellProps {
  label: ReactNode;
  amount: number;
  badgeLabel: string;
  badgeIcon: LucideIcon;
  /** سطر توضيحي تحت المبلغ (مثل النسبة) */
  sub?: ReactNode;
  children?: ReactNode;
}

const ShareDeedShell = ({ label, amount, badgeLabel, badgeIcon: BadgeIcon, sub, children }: ShareDeedShellProps) => (
  <section aria-label="حصتي" className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground waqf-frame animate-slide-up">
    {/* إطار داخلي برونزي رفيع كإطار الصكوك */}
    <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-sidebar-primary/25" aria-hidden="true" />
    <div className="relative p-5 sm:p-7 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-primary-foreground/80">{label}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-sidebar-primary px-2.5 py-1 text-xs font-bold text-sidebar-primary-foreground shrink-0">
          <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {badgeLabel}
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none tracking-tight">
          <AnimatedCounter value={amount} decimals={2} />
          <span className="text-lg sm:text-xl font-medium text-primary-foreground/80 ms-2">ر.س</span>
        </p>
        {sub && <p className="text-xs sm:text-sm text-primary-foreground/75">{sub}</p>}
      </div>
      {children}
    </div>
  </section>
);

export default ShareDeedShell;
