import { supabase } from '@/integrations/supabase/client';

/** All payment invoices of one contract across fiscal years (RLS decides who may read). */
export const fetchContractInvoicesForPdf = async (contractId: string) => {
  const { data, error } = await supabase.from('payment_invoices')
    .select('payment_number,due_date,amount,status')
    .eq('contract_id', contractId).order('payment_number').limit(500);
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r, amount: Number(r.amount) }));
};
