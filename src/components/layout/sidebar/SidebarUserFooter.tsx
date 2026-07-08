/**
 * SidebarUserFooter — معلومات المستخدم وزر تسجيل الخروج (presentational)
 * نسخة موحّدة: زر واحد يستجيب لحالة الطي بدلاً من 3 نسخ مكرّرة.
 */
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_LABELS } from '@/constants/roles';

interface SidebarUserFooterProps {
  email?: string | null;
  role?: string | null;
  sidebarOpen: boolean;
  onSignOut: () => void;
}

export const SidebarUserFooter: React.FC<SidebarUserFooterProps> = ({
  email, role, sidebarOpen, onSignOut,
}) => {
  const roleLabel = ROLE_LABELS[role || ''] || role;
  const showLabel = sidebarOpen; // mobile drawer دائماً مفتوح بصريًا

  const button = (
    <Button
      variant="ghost"
      aria-label="تسجيل الخروج"
      className={cn(
        'w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
        'focus-visible:ring-2 focus-visible:ring-destructive/60',
        !showLabel && 'lg:px-0'
      )}
      onClick={onSignOut}
    >
      <LogOut className="w-5 h-5" aria-hidden="true" />
      <span className={cn('ms-2 lg:inline', !sidebarOpen && 'lg:hidden')}>تسجيل الخروج</span>
    </Button>
  );

  return (
    <div
      className="px-4 pt-4 pb-16 lg:pb-4 border-t border-sidebar-border"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className={cn('mb-3 text-sm text-sidebar-foreground/80', !sidebarOpen && 'lg:hidden')}>
        {email && <p className="truncate">{email}</p>}
        {roleLabel && <p className="text-xs text-sidebar-primary mt-1">{roleLabel}</p>}
      </div>
      {sidebarOpen ? (
        button
      ) : (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="left" className="hidden lg:block">تسجيل الخروج</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
