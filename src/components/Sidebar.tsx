/**
 * مكون الشريط الجانبي (Sidebar)
 * يعرض قائمة التنقل ومعلومات المستخدم وزر تسجيل الخروج.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/constants';

interface SidebarContentProps {
  links: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  onSignOut: () => Promise<void>;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  links, sidebarOpen, setSidebarOpen, setMobileSidebarOpen, onSignOut,
}) => {
  const { user, role } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
          <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className={cn('font-display font-bold text-lg text-sidebar-foreground', !sidebarOpen && 'lg:hidden')}>
            إدارة الوقف
          </span>
        </div>
        {/* Desktop toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(false)}
          className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
       <TooltipProvider delayDuration={0}>
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const linkContent = (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                !sidebarOpen && 'lg:justify-center'
              )}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn(!sidebarOpen && 'lg:hidden')}>{link.label}</span>
            </Link>
          );

          if (!sidebarOpen) {
            return (
              <Tooltip key={link.to} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="left" className="hidden lg:block">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
       </TooltipProvider>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn('mb-3 text-sm text-sidebar-foreground/80', !sidebarOpen && 'lg:hidden')}>
          <p className="truncate">{user?.email}</p>
          <p className="text-xs text-sidebar-primary mt-1">
            {ROLE_LABELS[role || ''] || role}
          </p>
        </div>
        <TooltipProvider delayDuration={0}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              {!sidebarOpen ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive lg:px-0"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="lg:hidden mr-2">تسجيل الخروج</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="hidden lg:block">تسجيل الخروج</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="mr-2">تسجيل الخروج</span>
                </Button>
              )}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
                <AlertDialogDescription>هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onSignOut} className="bg-destructive hover:bg-destructive/90">
                  تسجيل الخروج
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </div>
    </>
  );
};

export default SidebarContent;
