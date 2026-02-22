/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { useContracts } from '@/hooks/useContracts';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemo } from 'react';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

const ContractsViewPage = () => {
  const { data: contracts, isLoading } = useContracts();
  const isMobile = useIsMobile();

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expired: 0, totalRent: 0, expiringSoon: 0 };
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const active = contracts.filter(c => c.status === 'active');
    return {
      total: contracts.length,
      active: active.length,
      expired: contracts.filter(c => c.status === 'expired').length,
      totalRent: active.reduce((sum, c) => sum + (c.rent_amount || 0), 0),
      expiringSoon: active.filter(c => new Date(c.end_date) <= in90Days).length,
    };
  }, [contracts]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA');
  const formatCurrency = (n: number) => n.toLocaleString('ar-SA') + ' ر.س';

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">العقود</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي العقود</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">نشطة</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">منتهية</p>
                <p className="text-xl font-bold">{stats.expired}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الإيجارات</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalRent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">قريبة الانتهاء</p>
                <p className="text-xl font-bold">{stats.expiringSoon}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {contracts?.map(contract => {
              const st = statusMap[contract.status] || { label: contract.status, variant: 'outline' as const };
              const property = (contract as any).property;
              return (
                <Card key={contract.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{contract.contract_number}</p>
                        <p className="text-sm text-muted-foreground">{contract.tenant_name}</p>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    {property && (
                      <p className="text-sm text-muted-foreground">العقار: {property.property_number}</p>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الإيجار</span>
                      <span className="font-medium">{formatCurrency(contract.rent_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">من</span>
                      <span>{formatDate(contract.start_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">إلى</span>
                      <span>{formatDate(contract.end_date)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم العقد</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">قيمة الإيجار</TableHead>
                    <TableHead className="text-right">تاريخ البداية</TableHead>
                    <TableHead className="text-right">تاريخ النهاية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts?.map(contract => {
                    const st = statusMap[contract.status] || { label: contract.status, variant: 'outline' as const };
                    const property = (contract as any).property;
                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.contract_number}</TableCell>
                        <TableCell>{contract.tenant_name}</TableCell>
                        <TableCell>{property?.property_number || '-'}</TableCell>
                        <TableCell>{formatCurrency(contract.rent_amount)}</TableCell>
                        <TableCell>{formatDate(contract.start_date)}</TableCell>
                        <TableCell>{formatDate(contract.end_date)}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ContractsViewPage;
