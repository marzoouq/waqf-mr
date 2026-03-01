import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdvanceRequests, useUpdateAdvanceStatus, type AdvanceRequest } from '@/hooks/useAdvanceRequests';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Loader2, CheckCircle, XCircle, Banknote, Clock } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-warning/20 text-warning', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-blue-500/20 text-blue-600', icon: CheckCircle },
  paid: { label: 'مصروف', color: 'bg-success/20 text-success', icon: Banknote },
  rejected: { label: 'مرفوض', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

const AdvanceRequestsTab = () => {
  const { fiscalYearId } = useFiscalYear();
  // M-05 fix: لا تمرر 'all' كـ UUID — حوّلها إلى undefined
  const fyId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : undefined;
  const { data: requests = [], isLoading } = useAdvanceRequests(fyId);
  const updateStatus = useUpdateAdvanceStatus();
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ id: string; userId?: string; amount?: number } | null>(null);

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
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات سُلف</p>
        ) : (
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
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.beneficiary?.name || '—'}</TableCell>
                  <TableCell>{Number(req.amount).toLocaleString()} ر.س</TableCell>
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