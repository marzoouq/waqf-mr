import { fmt } from '@/utils/format';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdvanceRequests, useUpdateAdvanceStatus, type AdvanceRequest } from '@/hooks/useAdvanceRequests';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Loader2, CheckCircle, XCircle, Banknote, Clock, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { safeNumber } from '@/utils/safeNumber';

const PAGE_SIZE = 20;

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-warning/20 text-warning', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-status-approved/20 text-status-approved-foreground', icon: CheckCircle },
  paid: { label: 'مصروف', color: 'bg-success/20 text-success', icon: Banknote },
  rejected: { label: 'مرفوض', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

const AdvanceRequestsTab = () => {
  const { fiscalYearId } = useFiscalYear();
  const fyId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : undefined;
  const [page, setPage] = useState(0);
  const { data: requests = [], isLoading } = useAdvanceRequests(fyId);
  const updateStatus = useUpdateAdvanceStatus();
  const { getJsonSetting } = useAppSettings();
  const advanceSettings = getJsonSetting('advance_settings', { enabled: true, min_amount: 500, max_percentage: 50 });
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ id: string; userId?: string; amount?: number } | null>(null);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const paginatedRequests = requests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // M-07 fix: استخدام AdvanceRequest بدل any
  const handleApprove = (req: AdvanceRequest) => updateStatus.mutate({
    id: req.id, status: 'approved',
    beneficiary_user_id: req.beneficiary?.user_id ?? undefined, amount: req.amount,
  });

  const handlePaid = (req: AdvanceRequest) => updateStatus.mutate({
    id: req.id, status: 'paid',
    beneficiary_user_id: req.beneficiary?.user_id ?? undefined, amount: req.amount,
  });

  // M-03 fix: استخدام mutateAsync مع await — الـ dialog يبقى مفتوحاً عند الفشل
  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await updateStatus.mutateAsync({
        id: rejectTarget.id, status: 'rejected', rejection_reason: rejectionReason,
        beneficiary_user_id: rejectTarget.userId, amount: rejectTarget.amount,
      });
      setRejectTarget(null);
      setRejectionReason('');
    } catch {
      // Toast يظهر من onError — الـ dialog يبقى مفتوحاً للمحاولة مرة أخرى
    }
  };

  const getStatusBadge = (status: string) => {
    const s = statusMap[status] || statusMap.pending;
    const Icon = s.icon;
    return <Badge className={`${s.color} hover:${s.color}`}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          طلبات السُلف
          {requests.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({requests.length})</span>
          )}
        </CardTitle>
        {!advanceSettings.enabled && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>طلبات السُلف معطّلة حالياً — المستفيدون لا يستطيعون تقديم طلبات جديدة</span>
          </div>
        )}
        {advanceSettings.enabled && (
          <p className="text-xs text-muted-foreground mt-1">
            الحد الأدنى: {fmt(advanceSettings.min_amount)} ر.س | الحد الأقصى: {advanceSettings.max_percentage}% من الحصة
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات سُلف</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">المستفيد</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.beneficiary?.name || '—'}</TableCell>
                    <TableCell>{fmt(safeNumber(req.amount))} ر.س</TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.reason || '—'}</TableCell>
                    <TableCell>{new Date(req.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() => handleApprove(req)} disabled={updateStatus.isPending}>
                              موافقة
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectTarget({ id: req.id, userId: req.beneficiary?.user_id ?? undefined, amount: req.amount })} disabled={updateStatus.isPending}>
                              رفض
                            </Button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <Button size="sm" onClick={() => handlePaid(req)} disabled={updateStatus.isPending}>
                            تأكيد الصرف
                          </Button>
                        )}
                        {req.status === 'rejected' && req.rejection_reason && (
                          <span className="text-xs text-muted-foreground">{req.rejection_reason}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-sm text-muted-foreground">
                  صفحة {page + 1} من {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* حوار الرفض */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب السلفة</DialogTitle>
            <DialogDescription>يرجى إدخال سبب الرفض</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="سبب الرفض..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || updateStatus.isPending}>تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdvanceRequestsTab;