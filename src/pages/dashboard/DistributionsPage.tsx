/**
 * صفحة /dashboard/distributions — توزيع الحصص على المستفيدين
 * صفحة مستقلة تعرض المبلغ المتاح وتفاصيل التوزيع وتفتح حوار التنفيذ.
 */
import { lazy, Suspense } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, PieChart, AlertTriangle, Wallet, PercentCircle } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { formatPercentage } from '@/utils/format';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useDistributionsPage } from '@/hooks/page/admin/financial/useDistributionsPage';

import DistributionDeliveryCard from '@/components/distributions/DistributionDeliveryCard';
import { FigureTile, FigureTileGrid, ExportMenu } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';

const DistributeDialog = lazy(() => import('@/components/accounts/DistributeDialog'));

const DistributionsPage = () => {
  const p = useDistributionsPage();
  const fyLabel = p.selectedFY?.label || p.fiscalYear || '';
  // التوزيع متاح فقط: للناظر، عند وجود حساب ختامي، ومتاح > 0، ومستفيدون، والسنة غير مقفلة، وسنة محددة (ليست 'all')
  const canDistribute =
    p.role === 'admin' &&
    !!p.currentAccount &&
    p.availableAmount > 0 &&
    p.beneficiaries.length > 0 &&
    !p.isClosed &&
    p.fiscalYearId !== 'all' &&
    !!p.fiscalYearId;


  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="توزيع الحصص"
          icon={Users}
          description="عرض المبلغ المتاح للتوزيع وتنفيذ صرف الحصص للمستفيدين"
          badge={fyLabel ? <Badge variant="secondary" className="text-xs">{fyLabel}</Badge> : undefined}
          actions={<><ExportMenu onExportPdf={p.handleExportPdf} />
            <Button
              className="gradient-primary gap-2"
              onClick={() => p.setDialogOpen(true)}
              disabled={!canDistribute}
            >
              <Wallet className="w-4 h-4" />
              <span>تنفيذ التوزيع</span>
            </Button></>
          }
        />

        <FigureTileGrid isLoading={p.isLoading} cols="sm:grid-cols-3 lg:grid-cols-5" skeletonCount={5}>
          <FigureTile
            label="المبلغ المتاح للتوزيع" value={p.availableAmount} icon={DOMAIN_ICONS.distribution} tone="share"
            className="col-span-2 sm:col-span-3 lg:col-span-1"
          />
          <FigureTile label="ريع الوقف" value={p.waqfRevenue} icon={DOMAIN_ICONS.income} tone="income" />
          <FigureTile label="إجمالي المرحّل المخصوم" value={p.totalCarryforward} icon={DOMAIN_ICONS.carryforward} tone="warning" />
          <FigureTile label="إجمالي السُلف المخصومة" value={p.totalAdvances} icon={Wallet} tone="expense" />
          <FigureTile label="نسبة التوزيع الفعلي" value={p.distributionRatio} icon={PercentCircle} unit="percent" />
        </FigureTileGrid>

        {!p.currentAccount && !p.isLoading && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              لا يوجد حساب ختامي للسنة المختارة. يُرجى إنشاؤه من صفحة الحسابات الختامية قبل تنفيذ التوزيع.
            </AlertDescription>
          </Alert>
        )}

        {p.currentAccount && p.availableAmount <= 0 && !p.isLoading && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              المبلغ المتاح للتوزيع صفر — لا يمكن تنفيذ التوزيع قبل ظهور ريع موجب.
            </AlertDescription>
          </Alert>
        )}

        {p.role === 'admin' && p.fiscalYearId && p.fiscalYearId !== 'all' && (
          <DistributionDeliveryCard fiscalYearId={p.fiscalYearId} />
        )}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              تفاصيل التوزيع المقترح
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.beneficiaries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">لا يوجد مستفيدون مسجلون</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المستفيد</TableHead>
                      <TableHead className="text-right">النسبة</TableHead>
                      <TableHead className="text-right">الحصة</TableHead>
                      <TableHead className="text-right">السُلف</TableHead>
                      <TableHead className="text-right">مرحّل</TableHead>
                      <TableHead className="text-right">الصافي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.distributions.map((d) => (
                      <TableRow key={d.beneficiary_id} className={d.deficit > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{d.beneficiary_name}</TableCell>
                        <TableCell>{formatPercentage(d.share_percentage)}</TableCell>
                        <TableCell className="tabular-nums">{fmt(d.share_amount)}</TableCell>
                        <TableCell className="tabular-nums">
                          {d.advances_paid > 0 ? (
                            <span className="text-destructive">-{fmt(d.advances_paid)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {d.carryforward_deducted > 0 ? (
                            <span className="text-warning">-{fmt(d.carryforward_deducted)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-bold text-primary tabular-nums">
                          {d.deficit > 0 ? '0' : fmt(d.net_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell>{formatPercentage(p.totalBeneficiaryPercentage)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(p.availableAmount)}</TableCell>
                      <TableCell className="tabular-nums text-destructive">{p.totalAdvances > 0 ? `-${fmt(p.totalAdvances)}` : '—'}</TableCell>
                      <TableCell className="tabular-nums text-warning">{p.totalCarryforward > 0 ? `-${fmt(p.totalCarryforward)}` : '—'}</TableCell>
                      <TableCell className="tabular-nums text-primary">{fmt(p.totalNet)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {p.dialogOpen && p.currentAccount && (
          <Suspense fallback={null}>
            <DistributeDialog
              open={p.dialogOpen}
              onOpenChange={p.setDialogOpen}
              beneficiaries={p.beneficiaries}
              availableAmount={p.distributionBase}
              totalBeneficiaryPercentage={p.totalBeneficiaryPercentage}
              accountId={p.currentAccount.id}
              fiscalYearId={p.fiscalYearId !== 'all' ? p.fiscalYearId : undefined}
              fiscalYearLabel={fyLabel}
            />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DistributionsPage;
