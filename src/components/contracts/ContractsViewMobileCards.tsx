/**
 * بطاقات الجوال لعرض العقود — المستفيد (الهوية الوقفية)
 * الحالة تصل مشتقة من تاريخ الانتهاء عبر هوك الصفحة.
 */
import { AlertTriangle, CalendarRange, Building2 } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format/format';
import { cn } from '@/lib/cn';
import { type ContractItem } from './contractsViewShared';
import { SingleContractPdfButton } from './SingleContractPdfButton';
import ContractStatusChip from './ContractStatusChip';

interface ContractsViewMobileCardsProps {
  contracts: ContractItem[];
  propertiesMap?: Record<string, string>;
  isExpiringSoon: (c: { status: string | null; end_date: string | null }) => boolean;
}

export default function ContractsViewMobileCards({ contracts, propertiesMap = {}, isExpiringSoon }: ContractsViewMobileCardsProps) {
  return (
    <ul className="space-y-3">
      {contracts.map(contract => {
        const active = contract.status === 'active';
        const property = (contract.property_id && propertiesMap[contract.property_id]) || null;
        return (
          <li
            key={contract.id}
            className={cn(
              'overflow-hidden rounded-2xl border bg-card shadow-sm border-s-4',
              active ? 'border-s-primary' : 'border-s-muted-foreground/40',
            )}
          >
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">رقم العقد</p>
                <p className="num truncate font-bold text-foreground">{contract.contract_number ?? ''}</p>
                {property && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />{property}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <ContractStatusChip status={contract.status} />
                {isExpiringSoon(contract) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />ينتهي قريباً
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 bg-muted/40 px-4 py-3">
              <div>
                <p className="text-[11px] text-muted-foreground">قيمة الإيجار</p>
                <p className="num text-lg font-bold text-primary">{fmt(contract.rent_amount ?? 0)} <span className="text-xs font-normal text-muted-foreground">ر.س</span></p>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                <bdi dir="ltr">{fmtDate(contract.start_date ?? '')}</bdi> ← <bdi dir="ltr">{fmtDate(contract.end_date ?? '')}</bdi>
              </p>
            </div>
            <div className="flex justify-end border-t px-3 py-2">
              <SingleContractPdfButton contract={contract} propertyLabel={property} withLabel />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
