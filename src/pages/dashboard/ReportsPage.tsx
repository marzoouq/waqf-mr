import { fmt } from '@/utils/format';
import { lazy, Suspense, useMemo } from 'react';
import CashFlowReport from '@/components/reports/CashFlowReport';
import OverdueTenantsReport from '@/components/reports/OverdueTenantsReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import ZakatEstimationReport from '@/components/reports/ZakatEstimationReport';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useAllUnits } from '@/hooks/useUnits';
import { CalendarRange, FileText, TrendingUp, ShieldCheck, Banknote, Scale, Calculator } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Badge } from '@/components/ui/badge';
import MonthlyPerformanceReport from '@/components/reports/MonthlyPerformanceReport';
import YearOverYearComparison from '@/components/reports/YearOverYearComparison';
import ExportMenu from '@/components/ExportMenu';
import type { ForensicAuditData } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { Progress } from '@/components/ui/progress';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercentage } from '@/lib/utils';

const LazyReportsCharts = lazy(() => import('@/components/reports/ReportsChartsInner'));

const ReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, fiscalYears } = useFiscalYear();
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
  const { data: allUnits = [] } = useAllUnits();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId || 'all');
  

  const selectedFiscalYearLabel = fiscalYear?.label;

  const {
    income, expenses, beneficiaries, currentAccount,
    totalIncome, totalExpenses, adminPct, waqifPct,
    zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance,
    incomeBySource, expensesByTypeExcludingVat,
    isLoading,
  } = useFinancialSummary(fiscalYearId || undefined, selectedFiscalYearLabel, { fiscalYearStatus: fiscalYear?.status });

  const beneficiariesShare = availableAmount;
  // N6 fix: "صافي الريع" should reflect after zakat, not just after expenses
  const netRevenue = netAfterZakat;

  const incomeSourceData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));
  const expenseTypeData = Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value }));

  // Beneficiary distributions
  // G2 fix: حساب الحصة كنسبة تناسبية من مجموع النسب (متوافق مع MySharePage)
  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage ?? 0), 0);
  const distributionData = beneficiaries.map((b) => ({
    name: b.name ?? 'غير معروف',
    amount: totalBeneficiaryPercentage > 0 ? (beneficiariesShare * (b.share_percentage ?? 0)) / totalBeneficiaryPercentage : 0,
    percentage: b.share_percentage ?? 0,
  }));


  // handlePrint removed - ExportMenu handles it

  const handleExportPDF = async () => {
    const { generateAnnualReportPDF } = await import('@/utils/pdf');
    await generateAnnualReportPDF({
      fiscalYear: currentAccount?.fiscal_year || fiscalYear?.label || '',
      totalIncome,
      totalExpenses,
      netRevenue,
      adminShare,
      waqifShare,
      waqfRevenue,
      expensesByType: expenseTypeData.map(d => ({ type: d.name, amount: d.value })),
      incomeBySource: incomeSourceData.map(d => ({ source: d.name, amount: d.value })),
      beneficiaries: distributionData.map(d => ({
        name: d.name ?? 'غير معروف',
        percentage: d.percentage ?? 0,
        amount: d.amount,
      })),
    }, pdfWaqfInfo);
  };

  // ─── Property Performance Data ──────────────────────────────────────
  const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
  // M-11 fix: memoize property performance to avoid recomputation on every render
  const propertyPerformance = useMemo(() => properties.map((property) => {
    const propertyUnits = allUnits.filter(u => u.property_id === property.id);
    const totalUnitsCount = propertyUnits.length;

    const propContracts = contracts.filter(c => c.property_id === property.id);
    const rentedUnitIds = new Set(
      propContracts
        .filter(c => (isSpecificYear || c.status === 'active') && c.unit_id)
        .map(c => c.unit_id)
    );
    const hasWholePropertyContract = propContracts.some(
      c => (isSpecificYear || c.status === 'active') && !c.unit_id
    );

    const isWholePropertyRented = totalUnitsCount === 0 && hasWholePropertyContract;
    const unitBasedRented = propertyUnits.filter(u => rentedUnitIds.has(u.id)).length;
    const rented = (totalUnitsCount > 0 && hasWholePropertyContract && unitBasedRented === 0)
      ? totalUnitsCount
      : (isWholePropertyRented ? totalUnitsCount : unitBasedRented);

    let occupancy: number;
    if (totalUnitsCount > 0) {
      occupancy = Math.round((rented / totalUnitsCount) * 100);
    } else if (isWholePropertyRented) {
      occupancy = 100;
    } else {
      occupancy = 0;
    }

    // N9 fix: only include active contracts in annualRent
    const annualRent = propContracts.filter(c => isSpecificYear || c.status === 'active').reduce((sum, c) => sum + Number(c.rent_amount), 0);
    const propExp = expenses.filter(e => e.property_id === property.id);
    const totalPropExpenses = propExp.reduce((sum, e) => sum + Number(e.amount), 0);
    const netIncome = annualRent - totalPropExpenses;

    return {
      id: property.id,
      name: property.property_number,
      type: property.property_type,
      totalUnits: totalUnitsCount,
      occupancy,
      annualRent,
      totalExpenses: totalPropExpenses,
      netIncome,
    };
  }).sort((a, b) => b.netIncome - a.netIncome), [properties, allUnits, contracts, expenses, isSpecificYear]);

  const perfTotals = useMemo(() => propertyPerformance.reduce(
    (acc, p) => ({
      totalUnits: acc.totalUnits + p.totalUnits,
      annualRent: acc.annualRent + p.annualRent,
      totalExpenses: acc.totalExpenses + p.totalExpenses,
      netIncome: acc.netIncome + p.netIncome,
    }),
    { totalUnits: 0, annualRent: 0, totalExpenses: 0, netIncome: 0 }
  ), [propertyPerformance]);

  // G4: إضافة فحص حالة السنة — الحصص = 0 في السنوات النشطة فلا يُقارن
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
        // J-08 fix: skip check for active years where shares are 0
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

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="التقارير"
          icon={CalendarRange}
          description="عرض التقارير والإحصائيات"
          badge={fiscalYear ? <Badge variant="secondary" className="text-xs">{fiscalYear.label}</Badge> : undefined}
          actions={<>
            <Button onClick={async () => {
              const { generateAnnualDisclosurePDF } = await import('@/utils/pdf');
              await generateAnnualDisclosurePDF({
                fiscalYear: currentAccount?.fiscal_year || fiscalYear?.label || '',
                totalIncome,
                totalExpenses,
                waqfCorpusPrevious,
                grandTotal,
                netAfterExpenses,
                vatAmount,
                netAfterVat,
                zakatAmount,
                netAfterZakat,
                adminShare,
                waqifShare,
                waqfRevenue,
                waqfCorpusManual,
                availableAmount,
                distributionsAmount,
                remainingBalance,
                incomeBySource: Object.fromEntries(incomeSourceData.map(d => [d.name, d.value])),
                expensesByType: Object.fromEntries(expenseTypeData.map(d => [d.name, d.value])),
                beneficiaries: distributionData.map(d => ({
                  name: d.name ?? 'غير معروف',
                  share_percentage: d.percentage ?? 0,
                  amount: d.amount,
                })),
                adminPct,
                waqifPct,
              }, pdfWaqfInfo);
            }} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">الإفصاح السنوي PDF</span>
            </Button>
            <Button onClick={async () => {
              const { generateForensicAuditPDF } = await import('@/utils/pdf');
              await generateForensicAuditPDF(forensicAuditData, pdfWaqfInfo);
            }} variant="outline" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">الفحص الجنائي PDF</span>
            </Button>
            <ExportMenu onExportPdf={handleExportPDF} />
          </>}
        />

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الدخل</p>
              <p className="text-lg sm:text-2xl font-bold text-success tabular-nums truncate">{fmt(totalIncome)} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-lg sm:text-2xl font-bold text-destructive tabular-nums truncate">{fmt(totalExpenses)} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">صافي الريع</p>
              <p className="text-lg sm:text-2xl font-bold text-primary tabular-nums truncate">{fmt(netRevenue)} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">عدد العقارات</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums">{properties.length}</p>
            </CardContent>
          </Card>
        </div>
        )}

        <ResponsiveTabs
          defaultValue="financial"
          items={[
            { value: 'financial', label: 'التقارير المالية', icon: <FileText className="w-4 h-4" /> },
            { value: 'performance', label: 'مقارنة أداء العقارات', icon: <TrendingUp className="w-4 h-4" /> },
            { value: 'monthly', label: 'الأداء الشهري', icon: <CalendarRange className="w-4 h-4" /> },
            { value: 'cashflow', label: 'التدفق النقدي', icon: <Banknote className="w-4 h-4" /> },
            { value: 'balance', label: 'الميزانية العمومية', icon: <Scale className="w-4 h-4" /> },
            { value: 'overdue', label: 'المتأخرون', icon: <FileText className="w-4 h-4" /> },
            { value: 'zakat', label: 'تقدير الزكاة', icon: <Calculator className="w-4 h-4" /> },
          ] satisfies TabItem[]}
        >
          <TabsContent value="financial" className="space-y-6">
            {/* Annual Disclosure */}
            <Card className="shadow-sm print:break-before-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  الإفصاح السنوي ({currentAccount?.fiscal_year || fiscalYear?.label || ''})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-primary">
                        <th className="py-3 px-4 text-right font-bold text-primary">البند</th>
                        <th className="py-3 px-4 text-right font-bold text-primary">المبلغ (ر.س)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waqfCorpusPrevious > 0 && (
                        <tr className="border-b bg-accent/10">
                          <td className="py-3 px-4 font-medium">رقبة الوقف المرحلة من العام السابق</td>
                          <td className="py-3 px-4 font-bold text-accent-foreground">+{fmt(waqfCorpusPrevious)}</td>
                        </tr>
                      )}
                      <tr className="bg-success/10">
                        <td colSpan={2} className="py-2 px-4 font-bold text-success text-center">-- الإيرادات --</td>
                      </tr>
                      {incomeSourceData.map((item, index) => (
                        <tr key={`income-${index}`} className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                          <td className="py-2 px-4 font-medium text-success">+{fmt(item.value)}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-success bg-success/10">
                        <td className="py-3 px-4 font-bold">إجمالي الإيرادات</td>
                        <td className="py-3 px-4 font-bold text-success">+{fmt(totalIncome)}</td>
                      </tr>
                      {waqfCorpusPrevious > 0 && (
                        <tr className="border-b-2 border-success bg-success/15">
                          <td className="py-3 px-4 font-bold">الإجمالي الشامل</td>
                          <td className="py-3 px-4 font-bold text-success">{fmt(grandTotal)}</td>
                        </tr>
                      )}
                      <tr className="bg-destructive/10">
                        <td colSpan={2} className="py-2 px-4 font-bold text-destructive text-center">-- المصروفات --</td>
                      </tr>
                      {expenseTypeData.map((item, index) => (
                        <tr key={`expense-${index}`} className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                          <td className="py-2 px-4 font-medium text-destructive">-{fmt(item.value)}</td>
                        </tr>
                      ))}
                      {/* J-05 fix: show VAT as separate expense line so items + VAT = totalExpenses */}
                      {vatAmount > 0 && (
                        <tr className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  ضريبة القيمة المضافة</td>
                          <td className="py-2 px-4 font-medium text-destructive">-{fmt(vatAmount)}</td>
                        </tr>
                      )}
                      <tr className="border-b-2 border-destructive bg-destructive/10">
                        <td className="py-3 px-4 font-bold">إجمالي المصروفات</td>
                        <td className="py-3 px-4 font-bold text-destructive">-{fmt(totalExpenses)}</td>
                      </tr>
                      <tr className="border-b-2 border-info bg-info/10">
                        <td className="py-3 px-4 font-bold">الصافي بعد المصاريف</td>
                        <td className="py-3 px-4 font-bold text-info">{fmt(netAfterExpenses)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-muted-foreground">(-) ضريبة القيمة المضافة</td>
                        <td className="py-3 px-4 text-destructive">-{fmt(vatAmount)}</td>
                      </tr>
                      <tr className="border-b-2 border-info bg-info/10">
                        <td className="py-3 px-4 font-bold">الصافي بعد الضريبة</td>
                        <td className="py-3 px-4 font-bold text-info">{fmt(netAfterVat)}</td>
                      </tr>
                      {zakatAmount > 0 && (
                        <>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">(-) الزكاة</td>
                            <td className="py-3 px-4 text-destructive">-{fmt(zakatAmount)}</td>
                          </tr>
                          <tr className="border-b-2 border-info bg-info/10">
                            <td className="py-3 px-4 font-bold">الصافي بعد الزكاة</td>
                            <td className="py-3 px-4 font-bold text-info">{fmt(netAfterZakat)}</td>
                          </tr>
                        </>
                      )}
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الناظر ({adminPct}%)</td>
                        <td className="py-3 px-4">{fmt(adminShare)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الواقف ({waqifPct}%)</td>
                        <td className="py-3 px-4">{fmt(waqifShare)}</td>
                      </tr>
                      <tr className="border-b-2 border-primary bg-muted/50">
                        <td className="py-3 px-4 font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</td>
                        <td className="py-3 px-4 font-bold text-primary">{fmt(waqfRevenue)}</td>
                      </tr>
                      {waqfCorpusManual > 0 && (
                        <tr className="border-b">
                          <td className="py-3 px-4 text-muted-foreground">(-) رقبة الوقف للعام الحالي</td>
                          <td className="py-3 px-4 text-destructive">-{fmt(waqfCorpusManual)}</td>
                        </tr>
                      )}
                      <tr className="border-b bg-primary/5">
                        <td className="py-3 px-4 font-bold">المبلغ المتاح</td>
                        <td className="py-3 px-4 font-bold text-primary">{fmt(availableAmount)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-muted-foreground">(-) التوزيعات</td>
                        <td className="py-3 px-4">{fmt(distributionsAmount)}</td>
                      </tr>
                      <tr className="border-b-2 border-primary bg-primary/10">
                        <td className="py-3 px-4 font-bold text-lg">الرصيد المتبقي</td>
                        <td className={`py-3 px-4 font-bold text-lg ${remainingBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(remainingBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
              <LazyReportsCharts incomeSourceData={incomeSourceData} expenseTypeData={expenseTypeData} />
            </Suspense>

            {/* Beneficiary Distribution */}
            <Card className="shadow-sm print:break-before-page">
              <CardHeader>
                <CardTitle>توزيع الحصص على المستفيدين</CardTitle>
              </CardHeader>
              <CardContent>
                {distributionData.length > 0 ? (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-2 md:hidden">
                      {distributionData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPercentage(item.percentage ?? 0)}</p>
                          </div>
                          <span className="text-primary font-bold text-sm">{fmt(item.amount)} ر.س</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-bold">
                        <span>الإجمالي</span>
                        <span className="text-primary">{fmt(beneficiariesShare)} ر.س</span>
                      </div>
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto"><Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right">المستفيد</TableHead>
                          <TableHead className="text-right">النسبة</TableHead>
                          <TableHead className="text-right">المبلغ المستحق</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributionData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{formatPercentage(item.percentage ?? 0)}</TableCell>
                            <TableCell className="text-primary font-medium">{fmt(item.amount)} ر.س</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>الإجمالي</TableCell>
                          <TableCell>{formatPercentage(beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage ?? 0), 0))}</TableCell>
                          <TableCell className="text-primary">{fmt(beneficiariesShare)} ر.س</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table></div>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">لا يوجد مستفيدين مسجلين</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  مقارنة أداء العقارات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {propertyPerformance.map((p) => {
                    const occupancyColor = p.occupancy >= 80 ? 'text-success' : p.occupancy >= 50 ? 'text-warning' : 'text-destructive';
                    return (
                      <Card key={p.id} className="shadow-sm">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{p.name}</span>
                            <span className={`text-xs font-semibold ${occupancyColor}`}>{p.occupancy}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <p className="text-[11px] text-muted-foreground">النوع</p>
                              <p className="text-sm">{p.type}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">الوحدات</p>
                              <p className="text-sm">{p.totalUnits > 0 ? p.totalUnits : (p.occupancy === 100 ? 'كامل' : '-')}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">الإيجار السنوي</p>
                              <p className="text-sm font-medium">{fmt(p.annualRent, 0)} ر.س</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">المصروفات</p>
                              <p className="text-sm text-destructive">{fmt(p.totalExpenses, 0)} ر.س</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[11px] text-muted-foreground">صافي الدخل</p>
                              <p className={`text-sm font-bold ${p.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(p.netIncome, 0)} ر.س</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">العقار</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الوحدات</TableHead>
                        <TableHead className="text-right min-w-[150px]">نسبة الإشغال</TableHead>
                        <TableHead className="text-right">الإيجار السنوي</TableHead>
                        <TableHead className="text-right">المصروفات</TableHead>
                        <TableHead className="text-right">صافي الدخل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertyPerformance.map((p, index) => {
                        const occupancyColor = p.occupancy >= 80 ? 'text-success' : p.occupancy >= 50 ? 'text-warning' : 'text-destructive';
                        const progressColor = p.occupancy >= 80 ? '[&>div]:bg-success' : p.occupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';
                        return (
                          <TableRow key={p.id} className={index % 2 === 0 ? '' : 'bg-muted/30'}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-bold">{p.name}</TableCell>
                            <TableCell>{p.type}</TableCell>
                            <TableCell>{p.totalUnits > 0 ? p.totalUnits : (p.occupancy === 100 ? 'كامل' : '-')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={p.occupancy} className={`h-2 flex-1 ${progressColor}`} />
                                <span className={`text-xs font-semibold whitespace-nowrap ${occupancyColor}`}>{p.occupancy}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{fmt(p.annualRent, 0)} ر.س</TableCell>
                            <TableCell className="text-destructive">{fmt(p.totalExpenses, 0)} ر.س</TableCell>
                            <TableCell className={`font-bold ${p.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {fmt(p.netIncome, 0)} ر.س
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/70 font-bold">
                        <TableCell colSpan={3}>الإجمالي</TableCell>
                        <TableCell>{perfTotals.totalUnits > 0 ? perfTotals.totalUnits : '-'}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">{fmt(perfTotals.annualRent, 0)} ر.س</TableCell>
                        <TableCell className="text-destructive font-bold">{fmt(perfTotals.totalExpenses, 0)} ر.س</TableCell>
                        <TableCell className={`font-bold ${perfTotals.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {fmt(perfTotals.netIncome, 0)} ر.س
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <MonthlyPerformanceReport
              income={income}
              expenses={expenses}
              fiscalYear={currentAccount?.fiscal_year}
            />
          </TabsContent>

          {/* تبويب المقارنة السنوية تم نقله — يُستخدم من صفحة المقارنة التاريخية المستقلة */}

          <TabsContent value="cashflow" className="space-y-6">
            <CashFlowReport
              income={income}
              expenses={expenses}
              fiscalYear={fiscalYear}
            />
          </TabsContent>

          <TabsContent value="balance" className="space-y-6">
            <BalanceSheetReport
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              vatAmount={vatAmount}
              zakatAmount={zakatAmount}
              adminShare={adminShare}
              waqifShare={waqifShare}
              waqfRevenue={waqfRevenue}
              waqfCorpusPrevious={waqfCorpusPrevious}
              waqfCorpusManual={waqfCorpusManual}
              distributionsAmount={distributionsAmount}
              availableAmount={availableAmount}
              
              grandTotal={grandTotal}
              netAfterExpenses={netAfterExpenses}
              netAfterVat={netAfterVat}
              netAfterZakat={netAfterZakat}
              fiscalYearLabel={fiscalYear?.label}
            />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            <OverdueTenantsReport
              contracts={contracts}
              paymentInvoices={paymentInvoices}
              properties={properties}
            />
          </TabsContent>

          <TabsContent value="zakat" className="space-y-6">
            <ZakatEstimationReport
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              vatAmount={vatAmount}
              netAfterVat={netAfterVat}
              zakatAmount={zakatAmount}
              netAfterZakat={netAfterZakat}
              waqfCorpusPrevious={waqfCorpusPrevious}
              grandTotal={grandTotal}
              fiscalYearLabel={fiscalYear?.label}
            />
          </TabsContent>
        </ResponsiveTabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
