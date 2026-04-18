import { fmt } from '@/utils/format/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Banknote, AlertTriangle } from 'lucide-react';
import { useAdvanceRequestsState } from '@/hooks/page/admin/accounts/useAdvanceRequestsState';
import AdvanceRequestsTable from '@/components/accounts/advance/AdvanceRequestsTable';
import RejectAdvanceDialog from '@/components/accounts/advance/RejectAdvanceDialog';

const AdvanceRequestsTab = () => {
  const ctx = useAdvanceRequestsState();

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          طلبات السُلف
          {ctx.requests.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({ctx.requests.length})</span>
          )}
        </CardTitle>
        {!ctx.advanceSettings.enabled && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>طلبات السُلف معطّلة حالياً — المستفيدون لا يستطيعون تقديم طلبات جديدة</span>
          </div>
        )}
        {ctx.advanceSettings.enabled && (
          <p className="text-xs text-muted-foreground mt-1">
            الحد الأدنى: {fmt(ctx.advanceSettings.min_amount)} ر.س | الحد الأقصى: {ctx.advanceSettings.max_percentage}% من الحصة
          </p>
        )}
      </CardHeader>
      <CardContent>
        {ctx.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : ctx.requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات سُلف</p>
        ) : (
          <AdvanceRequestsTable
            paginatedRequests={ctx.paginatedRequests}
            page={ctx.page}
            totalPages={ctx.totalPages}
            setPage={ctx.setPage}
            isMutating={ctx.isMutating}
            onApprove={ctx.handleApprove}
            onPaid={ctx.handlePaid}
            onReject={ctx.openReject}
          />
        )}
      </CardContent>

      <RejectAdvanceDialog
        open={!!ctx.rejectTarget}
        rejectionReason={ctx.rejectionReason}
        onReasonChange={ctx.setRejectionReason}
        onClose={ctx.closeReject}
        onConfirm={ctx.handleReject}
        isPending={ctx.isMutating}
      />
    </Card>
  );
};

export default AdvanceRequestsTab;
