/**
 * usePropertyVatSync — مزامنة ضريبة القيمة المضافة على فواتير عقار
 * يستدعي RPC sync_property_contract_invoice_vat ويعيد نتيجة (updated, skipped).
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VatSyncResult {
  updated: number;
  skipped: number;
}

export function usePropertyVatSync() {
  return useMutation({
    mutationFn: async (propertyId: string): Promise<VatSyncResult> => {
      const { data, error } = await supabase.rpc('sync_property_contract_invoice_vat', {
        p_property_id: propertyId,
      });
      if (error) throw error;
      const result = (data ?? {}) as { updated?: number; skipped?: number };
      return {
        updated: Number(result.updated ?? 0),
        skipped: Number(result.skipped ?? 0),
      };
    },
  });
}
