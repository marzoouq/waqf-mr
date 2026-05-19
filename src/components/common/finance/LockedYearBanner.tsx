/**
 * #50 — بانر موحّد لحالة "السنة المالية المقفلة"
 * يُستخدم في صفحات: الفواتير، الدخل، المصروفات
 *
 * يعرض رسالتين حسب الدور:
 * - admin: تنبيه إيجابي بأن لديه صلاحية التعديل كناظر
 * - باقي الأدوار: تحذير بأن السنة مقفلة ولا يمكن التعديل
 */
import { Lock, ShieldCheck } from 'lucide-react';

interface LockedYearBannerProps {
  isClosed: boolean;
  role: string | null | undefined;
  /** حجم الأيقونة — افتراضي w-3 h-3 (الفواتير تستخدم w-4 h-4) */
  iconSize?: 'sm' | 'md';
}

const LockedYearBanner = ({ isClosed, role, iconSize = 'sm' }: LockedYearBannerProps) => {
  if (!isClosed) return null;

  const iconClass = iconSize === 'md' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <div className="flex flex-wrap items-center gap-4">
      {role === 'admin' ? (
        <span className="text-sm text-success font-medium flex items-center gap-1 bg-success/10 px-3 py-1 rounded-md border border-success/30">
          <ShieldCheck className={iconClass} /> سنة مقفلة — لديك صلاحية التعديل كناظر
        </span>
      ) : (
        <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
          <Lock className={iconClass} /> سنة مقفلة — لا يمكن التعديل
        </span>
      )}
    </div>
  );
};

export default LockedYearBanner;
