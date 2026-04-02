/**
 * هوك لاسترجاع الحد الأقصى للسلفة من الخادم
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServerAdvanceData {
  estimated_share: number;
  active_carryforward: number;
  effective_share: number;
  paid_advances: number;
  max_advance: number;
}

export function useMaxAdvanceAmount(
  open: boolean,
  beneficiaryId: string,
  fiscalYearId?: string,
) {
  const [serverData, setServerData] = useState<ServerAdvanceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !beneficiaryId || !fiscalYearId) return;
    let cancelled = false;
    setLoading(true);
    Promise.resolve(supabase.rpc('get_max_advance_amount', {
      p_beneficiary_id: beneficiaryId,
      p_fiscal_year_id: fiscalYearId,
    })).then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data && !(data as Record<string, unknown>).error) {
        setServerData(data as unknown as ServerAdvanceData);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        toast.warning('تعذّر التحقق من الحد الأقصى — يُرجى المراجعة يدوياً');
      }
    });
    return () => { cancelled = true; };
  }, [open, beneficiaryId, fiscalYearId]);

  return { serverData, loading };
}
