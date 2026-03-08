import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-4 sm:p-6 print:hidden animate-slide-up',
        className,
      )}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-11 h-11 sm:w-14 sm:h-14 gradient-gold rounded-2xl flex items-center justify-center shadow-gold shrink-0">
              <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground truncate">
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
};

export default PageHeaderCard;
