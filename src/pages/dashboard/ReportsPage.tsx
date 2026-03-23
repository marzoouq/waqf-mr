import { fmt } from '@/utils/format';
import { lazy, Suspense } from 'react';
import { usePropertyPerformance } from '@/hooks/financial/usePropertyPerformance';
import CashFlowReport from '@/components/reports/CashFlowReport';
import OverdueTenantsReport from '@/components/reports/OverdueTenantsReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import ZakatEstimationReport from '@/components/reports/ZakatEstimationReport';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/data/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useAllUnits } from '@/hooks/data/useUnits';
import { CalendarRange, FileText, TrendingUp, ShieldCheck, Banknote, Scale, Calculator } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Badge } from '@/components/ui/badge';
import MonthlyPerformanceReport from '@/components/reports/MonthlyPerformanceReport';

import ExportMenu from '@/components/ExportMenu';
import type { ForensicAuditData } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import AnnualDisclosureTable from '@/components/reports/AnnualDisclosureTable';
import PropertyPerformanceTable from '@/components/reports/PropertyPerformanceTable';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { Progress } from '@/components/ui/progress';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercentage } from '@/lib/utils';

const LazyReportsCharts = lazy(() => import('@/components/reports/ReportsChartsInner'));

const ReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
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
  const { isSpecificYear } = useFiscalYear();
  const { propertyPerformance, perfTotals } = usePropertyPerformance(
    properties, contracts, expenses, allUnits, isSpecificYear
  );

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
            <AnnualDisclosureTable
              fiscalYearLabel={currentAccount?.fiscal_year || fiscalYear?.label || ''}
              waqfCorpusPrevious={waqfCorpusPrevious}
              incomeSourceData={incomeSourceData}
              totalIncome={totalIncome}
              grandTotal={grandTotal}
              expenseTypeData={expenseTypeData}
              vatAmount={vatAmount}
              totalExpenses={totalExpenses}
              netAfterExpenses={netAfterExpenses}
              netAfterVat={netAfterVat}
              zakatAmount={zakatAmount}
              netAfterZakat={netAfterZakat}
              adminPct={adminPct}
              waqifPct={waqifPct}
              adminShare={adminShare}
              waqifShare={waqifShare}
              waqfRevenue={waqfRevenue}
              waqfCorpusManual={waqfCorpusManual}
              availableAmount={availableAmount}
              distributionsAmount={distributionsAmount}
              remainingBalance={remainingBalance}
            />

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
            <PropertyPerformanceTable propertyPerformance={propertyPerformance} perfTotals={perfTotals} />
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
