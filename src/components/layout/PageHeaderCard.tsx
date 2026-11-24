import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LucideIcon } from 'lucide-react';

interface PageHeaderCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * رأس الصفحة الموحّد لجميع صفحات النظام (الهوية الوقفية الجديدة)
 * شريط أخضر وقفي بإطار برونزي + أيقونة + عنوان أميري + وصف + إجراءات.
 * نفس شكل PageHero حتى تتطابق كل الصفحات.
 */
const PageHeaderCard = ({ title, description, icon: Icon, badge, actions, className }: PageHeaderCardProps) => {
  return (
    <section
      aria-label={title}
      className={cn(
        'relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground waqf-frame print:hidden animate-slide-up',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-sidebar-primary/20" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div data-slot="page-icon" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/20 ring-1 ring-sidebar-primary/40 sm:h-12 sm:w-12">
              <Icon className="h-5 w-5 text-sidebar-primary sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words font-display text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {description && <p className="mt-1 text-xs text-primary-foreground/75 sm:text-sm">{description}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 [&_button]:border-primary-foreground/25 [&_button]:bg-primary-foreground/10 [&_button]:text-primary-foreground [&_button:hover]:bg-primary-foreground/20 [&_button.bg-primary]:border-sidebar-primary [&_button.bg-primary]:bg-sidebar-primary [&_button.bg-primary]:text-sidebar-primary-foreground [&_button.bg-primary]:font-bold [&_a]:text-primary-foreground">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};

export default PageHeaderCard;
