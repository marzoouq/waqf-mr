/**
 * صفحة تاريخ الترحيلات والفروق المخصومة من حصة المستفيد
 */
import DashboardLayout from '@/components/DashboardLayout';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
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
  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['advance_carryforward'] });
    queryClient.invalidateQueries({ queryKey: ['advance_requests'] });
    queryClient.invalidateQueries({ queryKey: ['my-beneficiary'] });
  };
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

  const { data: carryforwards = [], isLoading: loadingCF } = useMyCarryforwards(beneficiary?.id ?? undefined);
  const { data: advances = [], isLoading: loadingAdv } = useMyAdvanceRequests(beneficiary?.id ?? undefined);
  const { data: activeBalance = 0 } = useCarryforwardBalance(beneficiary?.id ?? undefined);

  const paidAdvances = advances.filter(a => a.status === 'paid');
  const totalPaidAdvances = paidAdvances.reduce((s, a) => s + safeNumber(a.amount), 0);
  const settledCF = carryforwards.filter(c => c.status === 'settled');
  const totalSettled = settledCF.reduce((s, c) => s + safeNumber(c.amount), 0);

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
                toast.info('جاري تجهيز الطباعة...');
                setTimeout(() => {
                  window.print();
                }, 300);
              }} />
            </div>
          }
        />

        {/* بطاقات ملخص */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي السُلف المصروفة</p>
                <p className="text-lg font-bold">{fmt(totalPaidAdvances)} ر.س</p>
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
                <p className="text-lg font-bold">{fmt(activeBalance)} ر.س</p>
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
                <p className="text-lg font-bold">{fmt(totalSettled)} ر.س</p>
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
                  <div key={cf.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-destructive text-sm">{fmt(safeNumber(cf.amount))} ر.س</span>
                      <Badge variant={cf.status === 'active' ? 'destructive' : 'default'} className="text-xs">
                        {cf.status === 'active' ? 'نشط' : 'مُسوّى'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">من سنة</p>
                        <p className="text-xs font-medium">{fyLabel(cf.from_fiscal_year_id)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">إلى سنة</p>
                        <p className="text-xs font-medium">{fyLabel(cf.to_fiscal_year_id)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">التاريخ</p>
                        <p className="text-xs font-medium">{new Date(cf.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                      {cf.notes && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">ملاحظات</p>
                          <p className="text-xs font-medium">{cf.notes}</p>
                        </div>
                      )}
                    </div>
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
                          {fmt(safeNumber(cf.amount))} ر.س
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
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {paidAdvances.map(adv => (
                  <div key={adv.id} className="border rounded-lg p-3 space-y-2">
                    <p className="font-medium text-sm">{fmt(safeNumber(adv.amount))} ر.س</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">السبب</p>
                        <p className="text-xs font-medium">{adv.reason || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">تاريخ الصرف</p>
                        <p className="text-xs font-medium">{adv.paid_at ? new Date(adv.paid_at).toLocaleDateString('ar-SA') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">تاريخ الطلب</p>
                        <p className="text-xs font-medium">{new Date(adv.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
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
                          {fmt(safeNumber(adv.amount))} ر.س
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
