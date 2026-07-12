/**
 * MaintenanceBanner — بانر علوي يظهر للناظر/الدعم عند تفعيل وضع الصيانة
 */
import { Wrench } from 'lucide-react';
import { useMaintenanceMode } from '@/hooks/application/useMaintenanceMode';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { MAINTENANCE_BYPASS_ROLES } from '@/constants/roles';
import type { AppRole } from '@/types';

export default function MaintenanceBanner() {
  const { role } = useAuth();
  const { isActive } = useMaintenanceMode();

  if (!isActive) return null;
  if (!role || !(MAINTENANCE_BYPASS_ROLES as AppRole[]).includes(role as AppRole)) return null;

  return (
    <div
      dir="rtl"
      role="alert"
      className="sticky top-0 z-50 w-full bg-amber-500/95 text-amber-950 border-b-2 border-amber-700 print:hidden"
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
        <Wrench className="w-4 h-4 shrink-0" />
        <span>وضع الصيانة مفعّل — أنت وحدك ترى النظام. المستخدمون الآخرون يرون شاشة الصيانة.</span>
      </div>
    </div>
  );
}
