/**
 * SidebarUserFooter — معلومات المستخدم وزر تسجيل الخروج (presentational)
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
}) => (
  <div
    className="px-4 pt-4 pb-16 lg:pb-4 border-t border-sidebar-border"
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    onTouchEnd={(e) => e.stopPropagation()}
  >
    <div className={cn('mb-3 text-sm text-sidebar-foreground/80', !sidebarOpen && 'lg:hidden')}>
      <p className="truncate">{email}</p>
      <p className="text-xs text-sidebar-primary mt-1">
        {ROLE_LABELS[role || ''] || role}
      </p>
    </div>
    <TooltipProvider delayDuration={0}>
      <div className="lg:hidden">
        <Button
          variant="ghost"
          className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="w-5 h-5" />
          <span className="ms-2">تسجيل الخروج</span>
        </Button>
      </div>
      {!sidebarOpen && (
        <div className="hidden lg:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive px-0"
                onClick={onSignOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تسجيل الخروج</TooltipContent>
          </Tooltip>
        </div>
      )}
      {sidebarOpen && (
        <div className="hidden lg:block">
          <Button
            variant="ghost"
            className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut className="w-5 h-5" />
            <span className="ms-2">تسجيل الخروج</span>
          </Button>
        </div>
      )}
    </TooltipProvider>
  </div>
);
