/**
 * صفحة تاريخ الترحيلات والفروق المخصومة من حصة المستفيد
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCarryforwards, useMyAdvanceRequests, useCarryforwardBalance } from '@/hooks/useAdvanceRequests';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import ExportMenu from '@/components/ExportMenu';
import { ArrowDownUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Wallet, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PageHeaderCard from '@/components/PageHeaderCard';

const CarryforwardHistoryPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = () => queryClient.invalidateQueries();
  const { user } = useAuth();
  const navigate = useNavigate();

  // جلب بيانات المستفيد
  const { data: beneficiary, isLoading: loadingBen, isError: benError } = useQuery({
    queryKey: ['my-beneficiary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, share_percentage')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // جلب السنوات المالية للربط
  const { data: fiscalYears } = useQuery({
    queryKey: ['fiscal_years_published_all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .eq('published', true)
        .order('start_date', { ascending: false });
      return data ?? [];
    },
  });

  const fyLabel = (id: string | null) => {
    if (!id) return '—';
    return fiscalYears?.find(f => f.id === id)?.label ?? id;
  };

  const { data: carryforwards = [], isLoading: loadingCF } = useMyCarryforwards(beneficiary?.id);
  const { data: advances = [], isLoading: loadingAdv } = useMyAdvanceRequests(beneficiary?.id);
  const { data: activeBalance = 0 } = useCarryforwardBalance(beneficiary?.id);

  const paidAdvances = advances.filter(a => a.status === 'paid');
  const totalPaidAdvances = paidAdvances.reduce((s, a) => s + Number(a.amount), 0);
  const settledCF = carryforwards.filter(c => c.status === 'settled');
  const totalSettled = settledCF.reduce((s, c) => s + Number(c.amount), 0);

  if (loadingBen || loadingCF || loadingAdv) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (benError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!beneficiary) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لم يتم العثور على بيانات المستفيد</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard
          title="تاريخ الترحيلات والخصومات"
          description="سجل تفصيلي للسُلف المصروفة والفروق المرحّلة والمبالغ المخصومة من حصتك"
          icon={ArrowDownUp}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
              <ExportMenu onExportPdf={() => {
                try {
                  window.print();
                  toast.success('جاري الطباعة...');
                } catch {
                  toast.error('حدث خطأ أثناء الطباعة');
                }
              }} />
            </div>
          }
        />

        {/* بطاقات ملخص */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي السُلف المصروفة</p>
                <p className="text-lg font-bold">{totalPaidAdvances.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">رصيد مرحّل نشط</p>
                <p className="text-lg font-bold">{activeBalance.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المُسوّى</p>
                <p className="text-lg font-bold">{totalSettled.toLocaleString('ar-SA')} ر.س</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عدد السُلف المصروفة</p>
                <p className="text-lg font-bold">{paidAdvances.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول الترحيلات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">سجل الفروق المرحّلة</CardTitle>
          </CardHeader>
          <CardContent>
            {carryforwards.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">لا توجد فروق مرحّلة</p>
            ) : (
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {carryforwards.map(cf => (
                  <div key={cf.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">من: {fyLabel(cf.from_fiscal_year_id)}</span>
                      <Badge variant={cf.status === 'active' ? 'destructive' : 'default'} className="text-xs">
                        {cf.status === 'active' ? 'نشط' : 'مُسوّى'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">إلى</span><p className="font-medium">{fyLabel(cf.to_fiscal_year_id)}</p></div>
                      <div><span className="text-muted-foreground">المبلغ</span><p className="font-medium text-destructive">{Number(cf.amount).toLocaleString('ar-SA')} ر.س</p></div>
                    </div>
                    {cf.notes && <p className="text-xs text-muted-foreground truncate">{cf.notes}</p>}
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">من السنة المالية</TableHead>
                      <TableHead className="text-right">إلى السنة المالية</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carryforwards.map(cf => (
                      <TableRow key={cf.id}>
                        <TableCell>{fyLabel(cf.from_fiscal_year_id)}</TableCell>
                        <TableCell>{fyLabel(cf.to_fiscal_year_id)}</TableCell>
                        <TableCell className="font-medium text-destructive">
                          {Number(cf.amount).toLocaleString('ar-SA')} ر.س
                        </TableCell>
                        <TableCell>
                          <Badge variant={cf.status === 'active' ? 'destructive' : 'default'} className="text-xs">
                            {cf.status === 'active' ? 'نشط' : 'مُسوّى'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {cf.notes || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(cf.created_at).toLocaleDateString('ar-SA')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* جدول السُلف المصروفة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">سجل السُلف المصروفة</CardTitle>
          </CardHeader>
          <CardContent>
            {paidAdvances.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">لا توجد سُلف مصروفة</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">تاريخ الصرف</TableHead>
                      <TableHead className="text-right">تاريخ الطلب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidAdvances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell className="font-medium">
                          {Number(adv.amount).toLocaleString('ar-SA')} ر.س
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                          {adv.reason || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {adv.paid_at ? new Date(adv.paid_at).toLocaleDateString('ar-SA') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(adv.created_at).toLocaleDateString('ar-SA')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CarryforwardHistoryPage;
