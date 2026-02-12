import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useAccounts } from '@/hooks/useAccounts';
import { Wallet, Percent, Clock, CheckCircle, AlertCircle, Download, Printer } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateMySharePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';

const MySharePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: accounts = [] } = useAccounts();

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

  const currentAccount = accounts[0];
  const totalIncome = Number(currentAccount?.total_income || 0);
  const totalExpenses = Number(currentAccount?.total_expenses || 0);
  const netAfterExpenses = Number(currentAccount?.net_after_expenses || 0);
  const vatAmount = Number(currentAccount?.vat_amount || 0);
  const netAfterVat = Number(currentAccount?.net_after_vat || 0);
  const zakatAmount = Number(currentAccount?.zakat_amount || 0);
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminShare = Number(currentAccount?.admin_share || 0);
  const waqifShare = Number(currentAccount?.waqif_share || 0);
  const waqfRevenue = Number(currentAccount?.waqf_revenue || 0);
  const waqfCorpusManual = Number(currentAccount?.waqf_corpus_manual || 0);
  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  const totalReceived = distributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const pendingAmount = distributions
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
        distributions: distributions.map(d => ({
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

  const handlePrint = () => {
    window.print();
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold font-display">حصتي من الريع</h1>
            <p className="text-muted-foreground mt-1">تفاصيل حصتك من ريع الوقف</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2" disabled={!currentBeneficiary}>
              <Download className="w-4 h-4" />
              تصدير PDF
            </Button>
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

        {/* Share Calculation Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>تفاصيل احتساب الحصة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span>إجمالي الإيرادات</span>
                <span className="font-bold text-success">+{totalIncome.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>(-) إجمالي المصروفات</span>
                <span className="font-bold text-destructive">-{totalExpenses.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>الصافي بعد المصاريف</span>
                <span className="font-bold">{netAfterExpenses.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-destructive">
                <span>(-) ضريبة القيمة المضافة</span>
                <span>-{vatAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-bold">الصافي بعد خصم الضريبة</span>
                <span className="font-bold text-primary">{netAfterVat.toLocaleString()} ر.س</span>
              </div>
              {zakatAmount > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 border-b text-destructive">
                    <span>(-) الزكاة</span>
                    <span>-{zakatAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-bold">الصافي بعد الزكاة</span>
                    <span className="font-bold">{netAfterZakat.toLocaleString()} ر.س</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                <span>(-) حصة الناظر</span>
                <span>{adminShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                <span>(-) حصة الواقف</span>
                <span>{waqifShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>ريع الوقف</span>
                <span className="font-bold">{waqfRevenue.toLocaleString()} ر.س</span>
              </div>
              {waqfCorpusManual > 0 && (
                <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                  <span>(-) رقبة الوقف</span>
                  <span>{waqfCorpusManual.toLocaleString()} ر.س</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b">
                <span>الإجمالي القابل للتوزيع</span>
                <span className="font-bold">{beneficiariesShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-4 mt-4">
                <span className="font-bold">حصتي ({currentBeneficiary?.share_percentage || 0}%)</span>
                <span className="font-bold text-primary text-xl">{myShare.toLocaleString()} ر.س</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distributions History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>سجل التوزيعات</CardTitle>
          </CardHeader>
          <CardContent>
            {distributions.length === 0 ? (
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
                  {distributions.map((dist) => (
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
