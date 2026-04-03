/**
 * هوك بيانات سجل عمليات ZATCA
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ZatcaLogEntry {
  id: string;
  operation_type: string;
  status: string;
  request_summary: Record<string, unknown>;
  response_summary: Record<string, unknown>;
  error_message: string | null;
  invoice_id: string | null;
  user_id: string | null;
  created_at: string;
}

export const useZatcaOperationLog = () => {
  return useQuery({
    queryKey: ['zatca-operation-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zatca_operation_log')
        .select('id, operation_type, invoice_id, status, error_message, request_summary, response_summary, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ZatcaLogEntry[];
    },
    refetchInterval: 30000,
  });
};
