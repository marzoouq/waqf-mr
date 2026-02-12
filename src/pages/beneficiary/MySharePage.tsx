import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Percent, Clock, CheckCircle, AlertCircle, FileText, RefreshCw, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExportMenu from '@/components/ExportMenu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateMySharePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';

const MySharePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: activeFY, fiscalYears } = useActiveFiscalYear();
  const [selectedFYId, setSelectedFYId] = useState<string>('');
  const fiscalYearId = selectedFYId || activeFY?.id || '';
  const selectedFY = fiscalYears.find(fy => fy.id === fiscalYearId) || activeFY;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    beneficiaries,
    currentAccount,
    totalIncome,
    totalExpenses,
    netAfterVat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    vatAmount,
    zakatAmount,
    netAfterExpenses,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label);

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const { data: distributions = [] } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      const { data, error } = await supabase
        .from('distributions')
        .select('*, account:accounts(*)')
        .eq('beneficiary_id', currentBeneficiary.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;

  const myShare = currentBeneficiary
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100
    : 0;

  const filteredDistributions = currentAccount
    ? distributions.filter(d => d.account_id === currentAccount.id)
    : distributions;

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const handleDownloadPDF = async () => {
    if (!currentBeneficiary) return;
    try {
      await generateMySharePDF({
        beneficiaryName: currentBeneficiary.name,
        sharePercentage: currentBeneficiary.share_percentage,
        myShare,
        totalReceived,
        pendingAmount,
        netRevenue: netAfterVat,
        adminShare,
        waqifShare,
        beneficiariesShare,
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/20 text-success hover:bg-success/30"><CheckCircle className="w-3 h-3 ml-1" /> مستلم</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30"><Clock className="w-3 h-3 ml-1" /> معلق</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!currentBeneficiary) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <UserX className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-bold">لم يتم العثور على سجل المستفيد</h2>
          <p className="text-muted-foreground text-center">حسابك غير مرتبط بسجل مستفيد. يرجى التواصل مع ناظر الوقف.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold font-display">حصتي من الريع</h1>
            <p className="text-muted-foreground mt-1">تفاصيل حصتك من ريع الوقف</p>
          </div>
          <div className="flex items-center gap-2">
            <FiscalYearSelector value={fiscalYearId} onChange={setSelectedFYId} showAll={false} />
            <ExportMenu onExportPdf={handleDownloadPDF} />
          </div>
        </div>

        {/* Share Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/90">الحصة المستحقة</p>
                  <p className="text-2xl font-bold">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المبالغ المستلمة</p>
                  <p className="text-2xl font-bold text-success">{totalReceived.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المبالغ المعلقة</p>
                  <p className="text-2xl font-bold text-warning">{pendingAmount.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نسبة حصتي</p>
                  <p className="text-2xl font-bold">{currentBeneficiary?.share_percentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Link to Disclosure */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                لمعرفة تفاصيل احتساب الحصة والتسلسل المالي الكامل
              </p>
              <Button
                variant="link"
                className="text-primary gap-1"
                onClick={() => navigate('/beneficiary/disclosure')}
              >
                <FileText className="w-4 h-4" />
                صفحة الإفصاح السنوي
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Distributions History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>سجل التوزيعات</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDistributions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد توزيعات مسجلة بعد</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">السنة المالية</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributions.map((dist) => (
                    <TableRow key={dist.id}>
                      <TableCell>{dist.date}</TableCell>
                      <TableCell>{dist.account?.fiscal_year || '-'}</TableCell>
                      <TableCell className="font-bold">{Number(dist.amount).toLocaleString()} ر.س</TableCell>
                      <TableCell>{getStatusBadge(dist.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MySharePage;
