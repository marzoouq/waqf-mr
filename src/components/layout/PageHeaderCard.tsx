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
 * بطاقة هيدر موحّدة لجميع صفحات النظام
 * تعرض أيقونة + عنوان + وصف + أزرار إجراءات
 */
const PageHeaderCard = ({ title, description, icon: Icon, badge, actions, className }: PageHeaderCardProps) => {
  return (
    <div
      className={cn(
        'relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4 print:hidden animate-slide-up',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-gold rounded-xl flex items-center justify-center shadow-gold shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground break-words leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">{description}</p>
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
