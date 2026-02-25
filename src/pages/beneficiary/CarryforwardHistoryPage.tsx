/**
 * صفحة تاريخ الترحيلات والفروق المخصومة من حصة المستفيد
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCarryforwards, useMyAdvanceRequests, useCarryforwardBalance } from '@/hooks/useAdvanceRequests';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { ArrowDownUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Wallet } from 'lucide-react';

const CarryforwardHistoryPage = () => {
  const { user } = useAuth();

  // جلب بيانات المستفيد
  const { data: beneficiary, isLoading: loadingBen } = useQuery({
    queryKey: ['my-beneficiary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, share_percentage')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // جلب السنوات المالية للربط
  const { data: fiscalYears } = useQuery({
    queryKey: ['fiscal_years_all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_years')
        .select('id, label')
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
  const activeCF = carryforwards.filter(c => c.status === 'active');
  const totalSettled = settledCF.reduce((s, c) => s + Number(c.amount), 0);

  if (loadingBen || loadingCF || loadingAdv) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowDownUp className="w-6 h-6 text-primary" />
            تاريخ الترحيلات والخصومات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            سجل تفصيلي للسُلف المصروفة والفروق المرحّلة والمبالغ المخصومة من حصتك
          </p>
        </div>

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
              <div className="overflow-x-auto">
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
