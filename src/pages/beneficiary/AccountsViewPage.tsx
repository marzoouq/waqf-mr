import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { Wallet, FileText, TrendingUp, TrendingDown, PieChart, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { generateAccountsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useNavigate } from 'react-router-dom';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';

const AccountsViewPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    beneficiaries,
    currentAccount,
    totalIncome,
    totalExpenses,
    netAfterExpenses,
    waqfCorpusPrevious,
    vatAmount,
    netAfterVat,
    zakatAmount,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    distributionsAmount,
    grandTotal,
    availableAmount,
    incomeBySource,
    expensesByType,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label);

  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const totalRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);

  const myShare = currentBeneficiary
    ? (availableAmount * Number(currentBeneficiary.share_percentage)) / 100
    : 0;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  if (finError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (finLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">الحسابات الختامية</h1>
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1 text-sm">عرض تفصيلي للحسابات الختامية للوقف</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <ExportMenu onExportPdf={async () => {
              try {
                await generateAccountsPDF({
                  contracts: contracts.map(c => ({
                    contract_number: c.contract_number,
                    tenant_name: c.tenant_name,
                    rent_amount: Number(c.rent_amount),
                    status: c.status,
                  })),
                  incomeBySource,
                  expensesByType,
                  totalIncome,
                  totalExpenses,
                  netRevenue: netAfterVat,
                  adminShare,
                  waqifShare,
                  waqfRevenue,
                  beneficiaries: beneficiaries.map(b => ({
                    name: b.name,
                    share_percentage: Number(b.share_percentage),
                  })),
                  vatAmount,
                  zakatAmount,
                  waqfCorpusPrevious,
                  grandTotal,
                  netAfterExpenses,
                  netAfterVat,
                  waqfCapital: waqfCorpusManual,
                  distributionsAmount,
                  availableAmount,
                  remainingBalance: availableAmount - distributionsAmount,
                }, pdfWaqfInfo);
                toast.success('تم تصدير الحسابات الختامية بنجاح');
              } catch {
                toast.error('حدث خطأ أثناء تصدير PDF');
              }
            }} />
          </div>
        </div>

        {/* Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              ملخص الحسابات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">إجمالي الدخل</p>
                <p className="text-sm sm:text-xl font-bold truncate">{totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">إجمالي المصروفات</p>
                <p className="text-sm sm:text-xl font-bold truncate">{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">الصافي بعد الضريبة</p>
                <p className="text-sm sm:text-xl font-bold truncate">{netAfterVat.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">حصة الناظر</p>
                <p className="text-sm sm:text-xl font-bold truncate">{adminShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">حصة الواقف</p>
                <p className="text-sm sm:text-xl font-bold truncate">{waqifShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">ريع الوقف</p>
                <p className="text-sm sm:text-xl font-bold truncate">{waqfRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Share Highlight */}
        {currentBeneficiary && (
          <Card className="shadow-sm bg-primary/10 border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة</p>
                  <p className="text-xl sm:text-3xl font-bold text-primary truncate">{myShare.toLocaleString()} ر.س</p>
                </div>
                <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-primary/30 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contracts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">الإيجار السنوي</TableHead>
                      <TableHead className="text-right">الإيجار الشهري</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract, index) => (
                      <TableRow key={contract.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{contract.contract_number}</TableCell>
                        <TableCell>{contract.tenant_name}</TableCell>
                        <TableCell className="font-bold text-primary">{Number(contract.rent_amount).toLocaleString()} ريال</TableCell>
                        <TableCell className="font-bold text-primary">{Math.round(Number(contract.rent_amount) / 12).toLocaleString()} ريال</TableCell>
                        <TableCell>{statusLabel(contract.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/70 font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{contracts.length} عقد</TableCell>
                      <TableCell className="text-primary font-bold">{totalRent.toLocaleString()} ريال</TableCell>
                      <TableCell className="text-primary font-bold">{Math.round(totalRent / 12).toLocaleString()} ريال</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              تفصيل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">المصدر</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(incomeBySource).map(([source, amount]) => (
                    <TableRow key={source}>
                      <TableCell className="font-medium">{source}</TableCell>
                      <TableCell className="text-success">+{amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium text-sm">إجمالي الإيرادات</span>
              <span className="font-bold text-success text-sm sm:text-base">+{totalIncome.toLocaleString()} ريال</span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
              تفصيل المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(expensesByType).map(([type, amount]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell className="text-destructive">-{amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium text-sm">إجمالي المصروفات</span>
              <span className="font-bold text-destructive text-sm sm:text-base">-{totalExpenses.toLocaleString()} ريال</span>
            </div>
          </CardContent>
        </Card>

        {/* Link to Disclosure */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                للاطلاع على التسلسل المالي الكامل وتوزيع الحصص
              </p>
              <Button
                variant="link"
                className="text-primary gap-1 px-0 sm:px-3"
                onClick={() => navigate('/beneficiary/disclosure')}
              >
                <PieChart className="w-4 h-4" />
                صفحة الإفصاح السنوي
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountsViewPage;
