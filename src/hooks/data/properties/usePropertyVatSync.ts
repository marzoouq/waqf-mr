/**
 * usePropertyVatSync — مزامنة ضريبة القيمة المضافة على فواتير عقار
 * يستدعي RPC sync_property_contract_invoice_vat ويعيد نتيجة (updated, skipped).
 */
import { useMutation } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';

export interface VatSyncResult {
  updated: number;
  skipped: number;
}

export function usePropertyVatSync() {
  return useMutation({
    mutationFn: async (propertyId: string): Promise<VatSyncResult> => {
      const data = await rpc<{ updated?: number; skipped?: number } | null>(
        'sync_property_contract_invoice_vat',
        { p_property_id: propertyId },
      );
      const result = data ?? {};
      return {
        updated: Number(result.updated ?? 0),
        skipped: Number(result.skipped ?? 0),
      };
    },
  });
}
