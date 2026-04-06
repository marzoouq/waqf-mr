/**
 * @deprecated — استخدم الاستيراد من '@/hooks/data/financial' مباشرة
 */
export {
  useMyBeneficiaryFinance,
  useMyAdvanceRequests,
  usePaidAdvancesTotal,
  useCarryforwardBalance,
  useMyCarryforwards,
  useAllCarryforwards,
} from '@/hooks/data/financial/useAdvanceQueries';
export type { AdvanceRequest, AdvanceCarryforward } from '@/hooks/data/financial/useAdvanceQueries';
