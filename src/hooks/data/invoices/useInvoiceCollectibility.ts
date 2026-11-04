import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { invoicesKeys } from '@/lib/queryKeys/invoicesKeys';

export function useInvoiceCollectibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; uncollectible: boolean; reason: string }) => rpc('set_invoice_collectibility', {
      p_invoice_id: input.id, p_uncollectible: input.uncollectible, p_reason: input.reason,
    }, { maxAttempts: 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: invoicesKeys.prefixes.paymentInvoices }); },
  });
}