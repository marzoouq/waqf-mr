/**
 * useAuthCleanup — منطق التنظيف الجانبي عند تسجيل الخروج
 *
 * مستخرج من AuthContext لتحسين العزل وقابلية الاختبار وإعادة الاستخدام
 * (مثلاً عند idle_logout أو session expiry).
 *
 * يُنفّذ بترتيب صارم:
 *  1) queryClient.clear() — مسح كاش React Query
 *  2) مسح localStorage عبر CLEARABLE_STORAGE_KEYS
 *  3) مسح sessionStorage الحساس (FISCAL_YEAR, NID_LOCKED_UNTIL)
 *  4) dynamic import لـ monitoring (silent catch — لا يحتاج initial bundle)
 *  5) toast.dismiss() — إغلاق التوست النشط
 *
 * ملاحظة: لا يلمس setRole — تلك مسؤولية AuthContext لأنها state داخل الـ context.
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { STORAGE_KEYS, CLEARABLE_STORAGE_KEYS } from '@/constants/storageKeys';
import { safeRemove, safeSessionRemove } from '@/lib/storage';

export function useAuthCleanup() {
  const performCleanup = useCallback(() => {
    queryClient.clear();
    CLEARABLE_STORAGE_KEYS.forEach(key => safeRemove(key));
    safeSessionRemove(STORAGE_KEYS.FISCAL_YEAR);
    safeSessionRemove(STORAGE_KEYS.NID_LOCKED_UNTIL);
    // dynamic import — monitoring لا يحتاج في initial bundle
    import('@/lib/monitoring').then(m => {
      m.clearSlowQueries();
      m.clearPageLoadEntries();
    }).catch(() => { /* silent */ });
    toast.dismiss();
  }, []);

  return { performCleanup };
}
