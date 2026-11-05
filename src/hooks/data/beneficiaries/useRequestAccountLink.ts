/**
 * useRequestAccountLink — يرسل طلب ربط الحساب بسجل مستفيد إلى الناظر (مرة كل 24 ساعة)
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AccountLinkResult = 'sent' | 'already_requested' | 'already_linked';

export const useRequestAccountLink = () =>
  useMutation({
    mutationFn: async (): Promise<AccountLinkResult> => {
      const { data, error } = await supabase.rpc('request_account_link');
      if (error) throw error;
      return data as AccountLinkResult;
    },
  });
