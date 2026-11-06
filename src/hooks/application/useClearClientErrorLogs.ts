/**
 * useClearClientErrorLogs — للناظر: يمسح أخطاء الواجهة المحفوظة على الخادم
 * ويعلّم حوادث التنبيه محلولة، مع توثيق العملية في سجل المراجعة.
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function useClearClientErrorLogs(onDone?: () => void) {
  const [busy, setBusy] = useState(false);

  const clear = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('clear_client_error_logs');
      if (error) throw error;
      const r = (data ?? {}) as { deleted?: number; resolved?: number };
      toast.success(`تم مسح ${r.deleted ?? 0} خطأ واجهة وإغلاق ${r.resolved ?? 0} تنبيه`);
      onDone?.();
    } catch (e) {
      logger.error('[clear_client_error_logs] فشل:', e);
      toast.error('تعذّر مسح سجل الأخطاء');
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  return { clear, busy };
}
