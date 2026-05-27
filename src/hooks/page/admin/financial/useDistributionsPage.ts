/**
 * Page Hook لصفحة /dashboard/distributions
 * يعيد استخدام منطق التوزيع الموجود (useAccountsPage + useDistributionCalculation)
 * بدون تكرار حسابات أو منطق RPC.
 */
import { useState } from 'react';
import { useAccountsPage } from './useAccountsPage';
import { useDistributionCalculation } from '@/hooks/domain/financial/useDistributionCalculation';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

export function useDistributionsPage() {
  const acc = useAccountsPage();
  const { role } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const fyId = acc.fiscalYearId && acc.fiscalYearId !== 'all' ? acc.fiscalYearId : undefined;

  const calc = useDistributionCalculation(
    acc.beneficiaries,
    acc.availableAmount,
    fyId,
    true, // نحمّل السلف والمرحّل دائماً في الصفحة
  );


  // نسبة التوزيع الفعلي = المنفّذ يدوياً ÷ المتاح × 100 (مرحَّلة من لوحة الناظر)
  const distributionRatio = acc.availableAmount > 0
    ? Math.round((acc.manualDistributions / acc.availableAmount) * 100)
    : 0;

  return {
    // سياق
    role,
    fiscalYear: acc.fiscalYear,

    fiscalYearId: acc.fiscalYearId,
    selectedFY: acc.selectedFY,
    isClosed: acc.isClosed,
    isLoading: acc.isLoading,

    // أرقام مالية
    availableAmount: acc.availableAmount,
    waqfRevenue: acc.waqfRevenue,
    adminShare: acc.adminShare,
    waqifShare: acc.waqifShare,
    totalIncome: acc.totalIncome,
    totalExpenses: acc.totalExpenses,
    manualDistributions: acc.manualDistributions,
    remainingBalance: acc.remainingBalance,
    distributionRatio,

    // المستفيدون والتوزيع المحسوب
    beneficiaries: acc.beneficiaries,
    totalBeneficiaryPercentage: acc.totalBeneficiaryPercentage,
    distributions: calc.distributions,
    totalNet: calc.totalNet,
    totalAdvances: calc.totalAdvances,
    totalCarryforward: calc.totalCarryforward,
    totalDeficit: calc.totalDeficit,
    hasDeficit: calc.hasDeficit,

    // حساب ختامي (مطلوب لتنفيذ RPC execute_distribution)
    currentAccount: acc.currentAccount,

    // حوار التنفيذ
    dialogOpen, setDialogOpen,
  };
}
