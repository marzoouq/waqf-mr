/**
 * بطاقات التحصيل للموبايل
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import type { CollectionRow } from '@/hooks/page/admin/useCollectionData';

function getStatusBadge(status: CollectionRow['status']) {
  switch (status) {
    case 'complete': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مكتمل</Badge>;
    case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخر</Badge>;
    case 'partial': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />جزئي</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground border-0">لم يبدأ</Badge>;
  }
}

interface CollectionMobileCardsProps {
  rows: CollectionRow[];
}

const CollectionMobileCards = ({ rows }: CollectionMobileCardsProps) => (
  <div className="space-y-3 md:hidden px-3 py-2">
    {rows.map(row => (
      <Card key={row.contract.id} className={`shadow-sm ${row.overdue > 0 ? 'border-destructive/30' : ''}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm">{row.contract.contract_number}</span>
              <p className="text-xs text-muted-foreground">{row.contract.tenant_name}</p>
              {row.contract.status === 'expired' && (
                <Badge variant="outline" className="text-destructive border-destructive/30 text-[11px] mt-1">منتهي</Badge>
              )}
            </div>
            {getStatusBadge(row.status)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground text-xs">الدفعات</span>
              <p className="font-medium">
                {row.paid}/{row.paymentCount}
                {row.spansMultipleYears && (
                  <span className="text-muted-foreground text-[11px] mr-1">({row.totalContractPayments} إجمالي)</span>
                )}
              </p>
            </div>
            <div><span className="text-muted-foreground text-xs">قيمة الدفعة</span><p className="font-medium">{fmt(row.paymentAmount)} ر.س</p></div>
            <div><span className="text-muted-foreground text-xs">المحصّل</span><p className="font-medium text-success">{fmt(row.collectedAmount)} ر.س</p></div>
            {row.overdue > 0 && (
              <div><span className="text-muted-foreground text-xs">المتأخر</span><p className="font-medium text-destructive">{fmt(row.overdueAmount)} ر.س</p></div>
            )}
          </div>
          <Progress
            value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
            className={`h-2 ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
          />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default CollectionMobileCards;
