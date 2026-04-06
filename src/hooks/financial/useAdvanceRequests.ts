/**
 * @deprecated — استخدم الاستيراد من '@/hooks/data/financial' مباشرة
 */
export type { AdvanceRequest, AdvanceCarryforward } from '@/hooks/financial/advanceTypes';
export {
  useMyBeneficiaryFinance,
  useMyAdvanceRequests,
  usePaidAdvancesTotal,
  useCarryforwardBalance,
  useMyCarryforwards,
  useAllCarryforwards,
} from '@/hooks/data/financial/useAdvanceQueries';
export {
  useAdvanceRequests,
  useCreateAdvanceRequest,
  useUpdateAdvanceStatus,
} from '@/hooks/data/financial/useAdvanceRequests';
