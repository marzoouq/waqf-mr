/**
 * useCriticalAlerts — تنبيهات حرجة حيّة عبر Realtime على access_log
 * تُستخدم في CriticalAlertsBanner على AdminDashboard.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSmartRecommendations } from './useSmartRecommendations';
import { logger } from '@/lib/logger';

export const useCriticalAlerts = () => {
  const { recommendations, criticalCount, warningCount, refetch } = useSmartRecommendations();
  const [liveNudge, setLiveNudge] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('diag-critical-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_log' },
        (payload) => {
          const evt = (payload.new as { event_type?: string })?.event_type;
          if (evt === 'login_failed' || evt === 'client_error' || evt === 'unauthorized_access') {
            setLiveNudge((n) => n + 1);
            void refetch();
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') logger.warn('[criticalAlerts] channel error');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  const critical = recommendations.filter((r) => r.severity === 'critical');

  return {
    hasCritical: criticalCount > 0,
    criticalCount,
    warningCount,
    criticalItems: critical,
    liveNudge,
  };
};
