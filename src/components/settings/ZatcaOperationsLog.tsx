/**
 * مكون سجل عمليات ZATCA — عرض واحد حسب الشاشة
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Eye } from 'lucide-react';
import { useIsDesktop } from '@/hooks/ui/useIsDesktop';

const OPERATION_TYPE_LABELS: Record<string, string> = {
  'onboard': 'تهيئة وربط',
  'compliance-check': 'فحص امتثال',
  'production': 'شهادة إنتاج',
  'report': 'تبليغ فاتورة',
  'clearance': 'اعتماد فاتورة',
  'test-connection': 'اختبار اتصال',
};

const ZatcaOperationsLog = () => {
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['zatca-operation-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zatca_operation_log')
        .select('id, operation_type, invoice_id, status, error_message, request_summary, response_summary, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{
        id: string;
        operation_type: string;
        status: string;
        request_summary: Record<string, unknown>;
        response_summary: Record<string, unknown>;
        error_message: string | null;
        invoice_id: string | null;
        user_id: string | null;
        created_at: string;
      }>;
    },
    refetchInterval: 30000,
  });

  const buildDetail = (log: (typeof logs)[0]) => ({
    نوع_العملية: OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type,
    الحالة: log.status === 'success' ? 'نجح' : 'فشل',
    التاريخ: new Date(log.created_at).toLocaleString('ar-SA'),
    ملخص_الطلب: log.request_summary,
    ملخص_الرد: log.response_summary,
    رسالة_الخطأ: log.error_message || 'لا يوجد',
    معرف_الفاتورة: log.invoice_id || 'لا يوجد',
  });

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ تحميل السجل...</div>;

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد عمليات مسجلة بعد</p>
            <p className="text-sm mt-1">ستظهر هنا جميع عمليات التهيئة والربط مع ZATCA</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-5 h-5" />
            سجل العمليات ({logs.length})
          </CardTitle>
          <CardDescription>آخر 50 عملية مع بوابة فاتورة</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type}
                  </span>
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                    {log.status === 'success' ? '✅ نجح' : '❌ فشل'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(log.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setDetailItem(buildDetail(log))}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                {log.error_message && (
                  <p className="text-xs text-destructive line-clamp-2">{log.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="overflow-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">رسالة الخطأ</TableHead>
                  <TableHead className="text-right w-16">تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? '✅ نجح' : '❌ فشل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {log.error_message || '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setDetailItem(buildDetail(log))}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* حوار التفاصيل */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العملية</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap font-mono" dir="ltr">
            {JSON.stringify(detailItem, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ZatcaOperationsLog;
