/**
 * MaintenancePage — الشاشة المعروضة لغير admin/support أثناء وضع الصيانة
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wrench, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMaintenanceMode } from '@/hooks/application/useMaintenanceMode';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';
import { fmtDateTime } from '@/utils/format/format';
import { Navigate, useNavigate } from 'react-router-dom';
import { MAINTENANCE_BYPASS_ROLES } from '@/constants/roles';
import type { AppRole } from '@/types';

export default function MaintenancePage() {
  const { isActive, message, startedAt, isLoading } = useMaintenanceMode();
  const { role, user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(mins / 60);
      const rem = mins % 60;
      setElapsed(hours > 0 ? `${hours} س ${rem} د` : `${mins} د`);
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // إذا لم يعد الوضع مفعّلاً → إعادة توجيه للجذر
  if (!isLoading && !isActive) return <Navigate to="/" replace />;

  // admin/support لا يجب أن يصلوا هنا (لكن للأمان)
  if (role && (MAINTENANCE_BYPASS_ROLES as AppRole[]).includes(role as AppRole)) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: appSettingsKeys.all() });
  };


  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="max-w-lg w-full border-primary/30 shadow-2xl">
        <CardContent className="pt-10 pb-8 px-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">النظام تحت الصيانة</h1>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>

          {startedAt && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg py-3 px-4 space-y-1">
              <div>بدأت الصيانة: <span className="font-medium text-foreground">{fmtDateTime(startedAt)}</span></div>
              {elapsed && <div>المدة المنقضية: <span className="font-medium text-foreground">{elapsed}</span></div>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              إعادة المحاولة
            </Button>
            {user && (
              <Button
                variant="ghost"
                className="flex-1 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            نظام إدارة وقف مرزوق بن علي الثبيتي
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
