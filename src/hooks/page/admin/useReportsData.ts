/**
 * هوك بيانات صفحة التقارير — يستخرج المنطق المالي والتدقيقي
 */
import { useMemo } from 'react';
import { fmt } from '@/utils/format/format';
import { usePropertyPerformance } from '@/hooks/financial/usePropertyPerformance';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useAllUnits } from '@/hooks/data/properties/useUnits';

import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import type { ForensicAuditData } from '@/utils/pdf';

export function useReportsData() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
  const { data: allUnits = [] } = useAllUnits();
  

  const selectedFiscalYearLabel = fiscalYear?.label;

  const financial = useFinancialSummary(fiscalYearId || undefined, selectedFiscalYearLabel, { fiscalYearStatus: fiscalYear?.status });

  const {
    income, expenses, beneficiaries, currentAccount,
    totalIncome, totalExpenses, adminPct, waqifPct,
    zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance,
    incomeBySource, expensesByTypeExcludingVat,
    isLoading,
  } = financial;

  const beneficiariesShare = availableAmount;
  const netRevenue = netAfterZakat;

  const incomeSourceData = useMemo(() =>
    Object.entries(incomeBySource).map(([name, value]) => ({ name, value })),
    [incomeBySource]
  );

  const expenseTypeData = useMemo(() =>
    Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value })),
    [expensesByTypeExcludingVat]
  );

  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage ?? 0), 0);
  const distributionData = useMemo(() =>
    beneficiaries.map((b) => ({
      name: b.name ?? 'غير معروف',
      amount: totalBeneficiaryPercentage > 0 ? (beneficiariesShare * (b.share_percentage ?? 0)) / totalBeneficiaryPercentage : 0,
      percentage: b.share_percentage ?? 0,
    })),
    [beneficiaries, beneficiariesShare, totalBeneficiaryPercentage]
  );

  // أداء العقارات
  const { propertyPerformance, perfTotals } = usePropertyPerformance(
    properties, contracts, expenses, allUnits, isSpecificYear
  );

  // الفحص الجنائي
  const isYearClosed = fiscalYear?.status === 'closed';
  const auditChecks = [
    { key: 'account', ok: !!currentAccount },
    { key: 'incomeData', ok: income.length > 0 },
    { key: 'expenseData', ok: expenses.length > 0 },
    { key: 'contractsData', ok: contracts.length > 0 },
    { key: 'distributionConsistency', ok: availableAmount >= distributionsAmount },
    { key: 'shareConsistency', ok: !isYearClosed || Math.abs((adminShare + waqifShare + waqfRevenue) - netAfterZakat) < 1 },
  ];

  const issuesFound = auditChecks.filter(c => !c.ok).length;
  const issuesFixed = auditChecks.filter(c => c.ok).length;
  const overallScore = Math.round(((auditChecks.length - issuesFound) / Math.max(1, auditChecks.length)) * 100) / 10;

  const forensicAuditData: ForensicAuditData = {
    auditDate: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    auditorName: pdfWaqfInfo.waqfName || 'ناظر الوقف',
    overallScore,
    totalFiles: properties.length + contracts.length + income.length + expenses.length + beneficiaries.length,
    issuesFound,
    issuesFixed,
    categories: [
      {
        category: 'الحساب الختامي للسنة',
        status: currentAccount ? 'سليم' : 'ملاحظة',
        details: currentAccount ? 'تم العثور على حساب ختامي مرتبط بالسنة المالية المحددة.' : 'لا يوجد حساب ختامي مخزن للسنة المالية؛ يتم الاعتماد على الحساب الديناميكي.',
        score: currentAccount ? '10/10' : '6/10',
      },
      {
        category: 'تكامل بيانات التقارير',
        status: income.length > 0 && expenses.length > 0 ? 'سليم' : 'ملاحظة',
        details: `الإيرادات: ${income.length} سجل، المصروفات: ${expenses.length} سجل، العقود: ${contracts.length} سجل.`,
        score: income.length > 0 && expenses.length > 0 ? '10/10' : '7/10',
      },
      {
        category: 'اتساق التسلسل المالي',
        status: availableAmount >= distributionsAmount ? 'سليم' : 'ملاحظة',
        details: `المتاح للتوزيع ${fmt(availableAmount)} مقابل الموزع ${fmt(distributionsAmount)}.`,
        score: availableAmount >= distributionsAmount ? '10/10' : '5/10',
      },
      {
        category: 'اتساق معادلة الحصص',
        status: !isYearClosed || Math.abs((adminShare + waqifShare + waqfRevenue) - netAfterZakat) < 1 ? 'سليم' : 'ملاحظة',
        details: !isYearClosed ? 'السنة نشطة — لم تُحسب الحصص بعد.' : 'تمت مقارنة مجموع الحصص مع صافي ما بعد الزكاة للتحقق من سلامة الحساب.',
        score: !isYearClosed || Math.abs((adminShare + waqifShare + waqfRevenue) - netAfterZakat) < 1 ? '10/10' : '5/10',
      },
    ],
    securityFindings: [
      {
        finding: 'توفر قيود سنة مالية قابلة للتدقيق',
        severity: 'تحذير',
        status: currentAccount ? 'مُعالج' : 'معلق',
        notes: currentAccount ? 'السنة المالية الحالية مرتبطة بسجل حساب ختامي واضح.' : 'يُنصح بإغلاق السنة عبر الحسابات الختامية لتثبيت نتائج التقارير.',
      },
      {
        finding: 'سلامة الرصيد المتاح مقابل التوزيعات',
        severity: availableAmount >= distributionsAmount ? 'معلومة' : 'خطأ',
        status: availableAmount >= distributionsAmount ? 'مُعالج' : 'معلق',
        notes: availableAmount >= distributionsAmount
          ? 'لا يوجد تجاوز للتوزيعات على المبلغ المتاح في بيانات هذه السنة.'
          : 'تم رصد تجاوز توزيع على المتاح ويستلزم مراجعة فورية.',
      },
      {
        finding: 'اكتمال بيانات مصادر الإيراد والمصروف',
        severity: incomeSourceData.length > 0 && expenseTypeData.length > 0 ? 'معلومة' : 'تحذير',
        status: incomeSourceData.length > 0 && expenseTypeData.length > 0 ? 'مُعالج' : 'معلق',
        notes: incomeSourceData.length > 0 && expenseTypeData.length > 0
          ? 'التصنيفات المالية متاحة للتقارير البيانية والتدقيق.'
          : 'توجد فجوة في بيانات التصنيف تؤثر على دقة القراءة التحليلية.',
      },
    ],
  };

  return {
    pdfWaqfInfo, fiscalYear, fiscalYearId,
    properties, contracts, allUnits, paymentInvoices,
    income, expenses, beneficiaries, currentAccount,
    totalIncome, totalExpenses, adminPct, waqifPct,
    zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance, beneficiariesShare,
    netRevenue, incomeSourceData, expenseTypeData, distributionData,
    propertyPerformance, perfTotals,
    forensicAuditData, isLoading,
  };
}
