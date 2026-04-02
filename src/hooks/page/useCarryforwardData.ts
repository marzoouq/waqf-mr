/**
 * هوك بيانات صفحة تاريخ الترحيلات
 */
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { safeNumber } from '@/utils/safeNumber';

export const useCarryforwardData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['advance_carryforward'] });
    queryClient.invalidateQueries({ queryKey: ['advance_requests'] });
    queryClient.invalidateQueries({ queryKey: ['my-beneficiary'] });
  };

  // جلب بيانات المستفيد
  const { data: beneficiary, isLoading: loadingBen, isError: benError } = useQuery({
    queryKey: ['my-beneficiary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, share_percentage')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // جلب السنوات المالية للربط
  const { data: fiscalYears } = useQuery({
    queryKey: ['fiscal_years_published_all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .eq('published', true)
        .order('start_date', { ascending: false });
      return data ?? [];
    },
  });

  const fyLabel = (id: string | null) => {
    if (!id) return '—';
    return fiscalYears?.find(f => f.id === id)?.label ?? id;
  };

  const { data: benFinance, isLoading: loadingBenFin } = useMyBeneficiaryFinance(beneficiary?.id ?? undefined);
  const carryforwards = benFinance?.myCarryforwards ?? [];
  const advances = benFinance?.myAdvances ?? [];
  const activeBalance = benFinance?.carryforwardBalance ?? 0;

  const paidAdvances = advances.filter((a: { status: string }) => a.status === 'paid');
  const totalPaidAdvances = paidAdvances.reduce((s: number, a: { amount: number }) => s + safeNumber(a.amount), 0);
  const settledCF = carryforwards.filter((c: { status: string }) => c.status === 'settled');
  const totalSettled = settledCF.reduce((s: number, c: { amount: number }) => s + safeNumber(c.amount), 0);

  return {
    beneficiary,
    loadingBen,
    loadingBenFin,
    benError,
    handleRetry,
    carryforwards,
    paidAdvances,
    activeBalance,
    totalPaidAdvances,
    totalSettled,
    fyLabel,
  };
};