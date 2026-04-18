/**
 * فلاتر تبويب فواتير ZATCA — مُستخرَج من ZatcaInvoicesTab
 */
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck } from 'lucide-react';

interface Props {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  resetPage: () => void;
  isComplianceCert: boolean;
}

export default function ZatcaInvoiceFilters({ statusFilter, setStatusFilter, resetPage, isComplianceCert }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="فلتر الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="not_submitted">لم تُرسل</SelectItem>
          <SelectItem value="submitted">مُرسلة</SelectItem>
          <SelectItem value="reported">تم الإبلاغ</SelectItem>
          <SelectItem value="cleared">مُعتمدة</SelectItem>
          <SelectItem value="rejected">مرفوضة</SelectItem>
        </SelectContent>
      </Select>
      {isComplianceCert && (
        <Badge variant="secondary" className="gap-1">
          <ClipboardCheck className="w-3 h-3" />
          وضع فحص الامتثال
        </Badge>
      )}
    </div>
  );
}
