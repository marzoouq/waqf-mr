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
 * رأس الصفحة الموحّد لجميع صفحات النظام (الهوية الوقفية)
 * أيقونة برونزية هادئة + عنوان رسمي بخط أميري + وصف + أزرار إجراءات
 */
const PageHeaderCard = ({ title, description, icon: Icon, badge, actions, className }: PageHeaderCardProps) => {
  return (
    <div
      className={cn(
        'relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/70 pb-4 print:hidden animate-slide-up',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div data-slot="page-icon" className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-bronze-soft ring-1 ring-bronze-line flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-bronze-foreground" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary dark:text-foreground break-words leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 min-w-0">{actions}</div>
      )}
    </div>
  );
};

export default PageHeaderCard;
