/**
 * مكوّن عرض مجموعة عقود مُجمَّعة حسب الرقم الأساسي
 */
import { useMemo } from 'react';
import { Contract } from '@/types/database';
import { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getPaymentCount } from '@/utils/contractHelpers';
import ContractAccordionHeader from './ContractAccordionHeader';
import ContractVersionRow from './ContractVersionRow';
import InvoicePaymentsList from './InvoicePaymentsList';

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
  onPayInvoice?: (inv: PaymentInvoice) => void;
  onUnpayInvoice?: (invoiceId: string) => void;
  onDownloadInvoice?: (inv: PaymentInvoice) => void;
  loadingInvoiceId?: string | null;
  payingInvoiceId?: string | null;
  isClosed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-success/20 text-success border-success/30' },
  expired: { label: 'منتهي', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  pending: { label: 'معلق', className: 'bg-warning/20 text-warning border-warning/30' },
};

const ContractAccordionGroup = ({
  baseNumber, contracts, invoices, invoicePaidMap, expiredIds,
  selectedForRenewal, onToggleSelection, onEdit, onDelete, onRenew,
  onPayInvoice, onUnpayInvoice, onDownloadInvoice,
  loadingInvoiceId, payingInvoiceId, isClosed, open, onOpenChange,
}: ContractAccordionGroupProps) => {
  const latest = contracts[0]!;
  const latestStatus = statusConfig[latest.status] || { label: latest.status, className: 'bg-muted' };

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
        <ContractAccordionHeader
          baseNumber={baseNumber}
          tenantName={latest.tenant_name}
          propertyNumber={latest.property?.property_number || ''}
          unitNumber={latest.unit?.unit_number}
          rentAmount={Number(latest.rent_amount)}
          paid={paid}
          paymentCount={paymentCount}
          statusLabel={latestStatus.label}
          statusClassName={latestStatus.className}
          versionsCount={contracts.length}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border bg-muted/30">
          <div className="divide-y divide-border/50">
            {contracts.map((contract) => {
              const st = statusConfig[contract.status] || { label: contract.status, className: 'bg-muted' };
              return (
                <ContractVersionRow
                  key={contract.id}
                  contract={contract}
                  statusLabel={st.label}
                  statusClassName={st.className}
                  isExpired={expiredIds.has(contract.id)}
                  showCheckbox={hasExpired}
                  isSelected={selectedForRenewal.has(contract.id)}
                  onToggleSelection={onToggleSelection}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRenew={onRenew}
                />
              );
            })}
          </div>

          {/* دفعات العقد الأحدث */}
          <InvoicePaymentsList
            contract={latest}
            invoices={latestInvoices}
            onPayInvoice={onPayInvoice}
            onUnpayInvoice={onUnpayInvoice}
            onDownloadInvoice={onDownloadInvoice}
            loadingInvoiceId={loadingInvoiceId}
            payingInvoiceId={payingInvoiceId}
            isClosed={isClosed}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ContractAccordionGroup;
