import { useMemo } from 'react';
import CashFlowReport from '@/components/reports/CashFlowReport';
import OverdueTenantsReport from '@/components/reports/OverdueTenantsReport';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
// N10: removed unused useRef import
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useAllUnits } from '@/hooks/useUnits';
import { CalendarRange, FileText, TrendingUp, GitCompareArrows, ShieldCheck, Banknote } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Badge } from '@/components/ui/badge';
import MonthlyPerformanceReport from '@/components/reports/MonthlyPerformanceReport';
import YearOverYearComparison from '@/components/reports/YearOverYearComparison';
import ExportMenu from '@/components/ExportMenu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { ForensicAuditData } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercentage } from '@/lib/utils';

const REPORT_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
  'hsl(var(--accent))', 'hsl(var(--chart-4))',
];

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

const ReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, fiscalYears } = useFiscalYear();
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
  const { data: allUnits = [] } = useAllUnits();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId || undefined);
  // reportRef removed (N10 — was unused)

  const selectedFiscalYearLabel = fiscalYear?.label;

  const {
    income, expenses, beneficiaries, currentAccount,
    totalIncome, totalExpenses, adminPct, waqifPct,
    zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance,
    incomeBySource, expensesByType, expensesByTypeExcludingVat,
    isLoading,
  } = useFinancialSummary(fiscalYearId || undefined, selectedFiscalYearLabel, { fiscalYearStatus: fiscalYear?.status });

  const beneficiariesShare = availableAmount;
  // N6 fix: "صافي الريع" should reflect after zakat, not just after expenses
  const netRevenue = netAfterZakat;

  const incomeSourceData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));
  const expenseTypeData = Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value }));

  // Beneficiary distributions
  // G2 fix: حساب الحصة كنسبة تناسبية من مجموع النسب (متوافق مع MySharePage)
  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);
  const distributionData = beneficiaries.map((b) => ({
    name: b.name,
    amount: totalBeneficiaryPercentage > 0 ? (beneficiariesShare * b.share_percentage) / totalBeneficiaryPercentage : 0,
    percentage: b.share_percentage,
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
        name: d.name,
        percentage: d.percentage,
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
        details: `المتاح للتوزيع ${availableAmount.toLocaleString()} مقابل الموزع ${distributionsAmount.toLocaleString()}.`,
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
                  name: d.name,
                  share_percentage: d.percentage,
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
              <p className="text-lg sm:text-2xl font-bold text-success">{totalIncome.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-lg sm:text-2xl font-bold text-destructive">{totalExpenses.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">صافي الريع</p>
              <p className="text-lg sm:text-2xl font-bold text-primary">{netRevenue.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">عدد العقارات</p>
              <p className="text-lg sm:text-2xl font-bold">{properties.length}</p>
            </CardContent>
          </Card>
        </div>
        )}

        <Tabs defaultValue="financial" dir="rtl">
          <TabsList className="print:hidden w-full sm:w-auto">
            <TabsTrigger value="financial" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">التقارير المالية</span>
              <span className="sm:hidden">المالية</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">مقارنة أداء العقارات</span>
              <span className="sm:hidden">الأداء</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              <CalendarRange className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">الأداء الشهري</span>
              <span className="sm:hidden">شهري</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs sm:text-sm">
              <GitCompareArrows className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">مقارنة سنوية</span>
              <span className="sm:hidden">مقارنة</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">
              <Banknote className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">التدفق النقدي</span>
              <span className="sm:hidden">نقدي</span>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">المتأخرون</span>
              <span className="sm:hidden">متأخرون</span>
            </TabsTrigger>
          </TabsList>

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
                          <td className="py-3 px-4 font-bold text-accent-foreground">+{waqfCorpusPrevious.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="bg-success/10">
                        <td colSpan={2} className="py-2 px-4 font-bold text-success text-center">-- الإيرادات --</td>
                      </tr>
                      {incomeSourceData.map((item, index) => (
                        <tr key={`income-${index}`} className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                          <td className="py-2 px-4 font-medium text-success">+{item.value.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-success bg-success/10">
                        <td className="py-3 px-4 font-bold">إجمالي الإيرادات</td>
                        <td className="py-3 px-4 font-bold text-success">+{totalIncome.toLocaleString()}</td>
                      </tr>
                      {waqfCorpusPrevious > 0 && (
                        <tr className="border-b-2 border-success bg-success/15">
                          <td className="py-3 px-4 font-bold">الإجمالي الشامل</td>
                          <td className="py-3 px-4 font-bold text-success">{grandTotal.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="bg-destructive/10">
                        <td colSpan={2} className="py-2 px-4 font-bold text-destructive text-center">-- المصروفات --</td>
                      </tr>
                      {expenseTypeData.map((item, index) => (
                        <tr key={`expense-${index}`} className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                          <td className="py-2 px-4 font-medium text-destructive">-{item.value.toLocaleString()}</td>
                        </tr>
                      ))}
                      {/* J-05 fix: show VAT as separate expense line so items + VAT = totalExpenses */}
                      {vatAmount > 0 && (
                        <tr className="border-b">
                          <td className="py-2 px-4 pr-8 text-muted-foreground">  ضريبة القيمة المضافة</td>
                          <td className="py-2 px-4 font-medium text-destructive">-{vatAmount.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-b-2 border-destructive bg-destructive/10">
                        <td className="py-3 px-4 font-bold">إجمالي المصروفات</td>
                        <td className="py-3 px-4 font-bold text-destructive">-{totalExpenses.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b-2 border-info bg-info/10">
                        <td className="py-3 px-4 font-bold">الصافي بعد المصاريف</td>
                        <td className="py-3 px-4 font-bold text-info">{netAfterExpenses.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-muted-foreground">(-) ضريبة القيمة المضافة</td>
                        <td className="py-3 px-4 text-destructive">-{vatAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b-2 border-info bg-info/10">
                        <td className="py-3 px-4 font-bold">الصافي بعد الضريبة</td>
                        <td className="py-3 px-4 font-bold text-info">{netAfterVat.toLocaleString()}</td>
                      </tr>
                      {zakatAmount > 0 && (
                        <>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">(-) الزكاة</td>
                            <td className="py-3 px-4 text-destructive">-{zakatAmount.toLocaleString()}</td>
                          </tr>
                          <tr className="border-b-2 border-info bg-info/10">
                            <td className="py-3 px-4 font-bold">الصافي بعد الزكاة</td>
                            <td className="py-3 px-4 font-bold text-info">{netAfterZakat.toLocaleString()}</td>
                          </tr>
                        </>
                      )}
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الناظر ({adminPct}%)</td>
                        <td className="py-3 px-4">{adminShare.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الواقف ({waqifPct}%)</td>
                        <td className="py-3 px-4">{waqifShare.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b-2 border-primary bg-muted/50">
                        <td className="py-3 px-4 font-bold">ريع الوقف (الإجمالي القابل للتوزيع)</td>
                        <td className="py-3 px-4 font-bold text-primary">{waqfRevenue.toLocaleString()}</td>
                      </tr>
                      {waqfCorpusManual > 0 && (
                        <tr className="border-b">
                          <td className="py-3 px-4 text-muted-foreground">(-) رقبة الوقف للعام الحالي</td>
                          <td className="py-3 px-4 text-destructive">-{waqfCorpusManual.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-b bg-primary/5">
                        <td className="py-3 px-4 font-bold">المبلغ المتاح</td>
                        <td className="py-3 px-4 font-bold text-primary">{availableAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-muted-foreground">(-) التوزيعات</td>
                        <td className="py-3 px-4">{distributionsAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b-2 border-primary bg-primary/10">
                        <td className="py-3 px-4 font-bold text-lg">الرصيد المتبقي</td>
                        <td className={`py-3 px-4 font-bold text-lg ${remainingBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{remainingBalance.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>توزيع الدخل حسب المصدر</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={incomeSourceData} cx="50%" cy="50%" labelLine={true} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={90} fill="hsl(var(--primary))" dataKey="value" style={{ fontSize: '12px' }}>
                          {incomeSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>توزيع المصروفات حسب النوع</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expenseTypeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                        <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Beneficiary Distribution */}
            <Card className="shadow-sm print:break-before-page">
              <CardHeader>
                <CardTitle>توزيع الحصص على المستفيدين</CardTitle>
              </CardHeader>
              <CardContent>
                {distributionData.length > 0 ? (
                  <div className="overflow-x-auto"><Table className="min-w-[500px]">
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
                          <TableCell>{formatPercentage(item.percentage)}</TableCell>
                          <TableCell className="text-primary font-medium">{item.amount.toLocaleString()} ر.س</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>الإجمالي</TableCell>
                        <TableCell>{formatPercentage(beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0))}</TableCell>
                        <TableCell className="text-primary">{beneficiariesShare.toLocaleString()} ر.س</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table></div>
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
                <div className="overflow-x-auto">
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
                            <TableCell className="font-medium">{p.annualRent.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                            <TableCell className="text-destructive">{p.totalExpenses.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                            <TableCell className={`font-bold ${p.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {p.netIncome.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
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
                        <TableCell className="font-bold">{perfTotals.annualRent.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                        <TableCell className="text-destructive font-bold">{perfTotals.totalExpenses.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                        <TableCell className={`font-bold ${perfTotals.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {perfTotals.netIncome.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
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

          <TabsContent value="comparison" className="space-y-6">
            <YearOverYearComparison
              fiscalYears={fiscalYears}
              currentFiscalYearId={fiscalYearId}
            />
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <CashFlowReport
              income={income}
              expenses={expenses}
              fiscalYear={fiscalYear}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
