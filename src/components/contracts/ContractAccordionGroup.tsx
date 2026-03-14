/**
 * مكوّن عرض مجموعة عقود مُجمَّعة حسب الرقم الأساسي
 * يعرض: الصف الرئيسي (آخر عقد) → ينسدل ← تاريخ الإصدارات + الدفعات
 */
import { useMemo } from 'react';
import { Contract } from '@/types/database';
import { PaymentInvoice } from '@/hooks/usePaymentInvoices';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Edit, Trash2, RefreshCw, Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getPaymentCount, getPaymentTypeLabel } from '@/utils/contractHelpers';

interface ContractAccordionGroupProps {
  baseNumber: string;
  contracts: Contract[];
  invoices: PaymentInvoice[];
  invoicePaidMap: Map<string, number>;
  expiredIds: Set<string>;
  selectedForRenewal: Set<string>;
  onToggleSelection: (id: string) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onRenew: (contract: Contract) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-success/20 text-success border-success/30' },
  expired: { label: 'منتهي', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  pending: { label: 'معلق', className: 'bg-warning/20 text-warning border-warning/30' },
};

const invoiceStatusIcon = {
  paid: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  pending: <Clock className="w-3.5 h-3.5 text-warning" />,
  overdue: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  partially_paid: <Clock className="w-3.5 h-3.5 text-info" />,
};

const invoiceStatusLabel: Record<string, string> = {
  paid: 'مسددة',
  pending: 'معلقة',
  overdue: 'متأخرة',
  partially_paid: 'جزئية',
};

const ContractAccordionGroup = ({
  baseNumber,
  contracts,
  invoices,
  invoicePaidMap,
  expiredIds,
  selectedForRenewal,
  onToggleSelection,
  onEdit,
  onDelete,
  onRenew,
}: ContractAccordionGroupProps) => {
  // أحدث عقد = العقد الرئيسي المعروض
  const latest = contracts[0];
  const hasMultiple = contracts.length > 1;
  const latestStatus = statusConfig[latest.status] || { label: latest.status, className: 'bg-muted' };

  // دفعات العقد النشط/الأحدث
  const latestInvoices = useMemo(
    () => invoices.filter(inv => inv.contract_id === latest.id).sort((a, b) => a.payment_number - b.payment_number),
    [invoices, latest.id],
  );

  const paymentCount = getPaymentCount(latest);
  const paid = invoicePaidMap.get(latest.id) ?? 0;
  const hasExpired = contracts.some(c => expiredIds.has(c.id));

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="border border-border rounded-lg overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-right group"
        >
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />

          {/* معلومات العقد الرئيسية */}
          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1 items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm truncate">{baseNumber}</span>
              {hasMultiple && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {contracts.length} إصدار
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground truncate">{latest.tenant_name}</span>
            <span className="text-sm text-muted-foreground truncate hidden sm:block">
              {latest.property?.property_number || '-'}
              {latest.unit ? ` / و${latest.unit.unit_number}` : ''}
            </span>
            <span className="text-sm font-medium hidden lg:block">
              {Number(latest.rent_amount).toLocaleString()} ر.س
            </span>
            <div className="hidden lg:flex items-center gap-2">
              <span className={`text-xs font-bold ${paid >= paymentCount ? 'text-success' : paid > 0 ? 'text-warning' : 'text-destructive'}`}>
                {paid}/{paymentCount}
              </span>
              <Progress
                value={paymentCount > 0 ? (paid / paymentCount) * 100 : 0}
                className={`h-1.5 w-16 ${paid >= paymentCount ? '[&>div]:bg-success' : paid >= paymentCount / 2 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
              />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${latestStatus.className}`}>
              {latestStatus.label}
            </span>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border bg-muted/30">
          {/* قائمة إصدارات العقد */}
          <div className="divide-y divide-border/50">
            {contracts.map((contract, idx) => {
              const st = statusConfig[contract.status] || { label: contract.status, className: 'bg-muted' };
              const isExpired = expiredIds.has(contract.id);
              return (
                <div key={contract.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50 transition-colors">
                  {hasExpired && (
                    <div className="w-5 flex justify-center">
                      {isExpired ? (
                        <Checkbox
                          checked={selectedForRenewal.has(contract.id)}
                          onCheckedChange={() => onToggleSelection(contract.id)}
                        />
                      ) : null}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 items-center text-sm">
                    <span className="font-medium">{contract.contract_number}</span>
                    <span className="text-muted-foreground hidden sm:block">{contract.start_date}</span>
                    <span className="text-muted-foreground hidden sm:block">{contract.end_date}</span>
                    <span className="hidden sm:block">{Number(contract.rent_amount).toLocaleString()} ر.س</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${st.className}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-success hover:text-success/80" onClick={() => onRenew(contract)} title="تجديد">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(contract)} title="تعديل">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => onDelete(contract)} title="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* دفعات العقد الأحدث */}
          {latestInvoices.length > 0 && (
            <div className="border-t border-border px-5 py-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Receipt className="w-3.5 h-3.5" />
                <span>دفعات {latest.contract_number} ({getPaymentTypeLabel(latest.payment_type)})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {latestInvoices.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-2 text-sm"
                  >
                    {invoiceStatusIcon[inv.status] || <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-muted-foreground">دفعة {inv.payment_number}</span>
                    <span className="font-medium mr-auto">{Number(inv.amount).toLocaleString()} ر.س</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-success/15 text-success'
                        : inv.status === 'overdue' ? 'bg-destructive/15 text-destructive'
                        : 'bg-warning/15 text-warning'
                    }`}>
                      {invoiceStatusLabel[inv.status] || inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ContractAccordionGroup;
