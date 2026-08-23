/**
 * شبكة بطاقات العقود — المستفيد (وضع شبكي على الديسكتوب)
 * يُعيد استخدام تخطيط البطاقة المحمولة في شبكة 2/3 أعمدة
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format/format';
import { STATUS_MAP, type ContractItem } from './contractsViewShared';

interface ContractsViewGridCardsProps {
  contracts: ContractItem[];
  propertiesMap: Record<string, string>;
  isExpiringSoon: (c: { status: string | null; end_date: string | null }) => boolean;
}

export default function ContractsViewGridCards({ contracts, propertiesMap, isExpiringSoon }: ContractsViewGridCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {contracts.map(contract => {
        const st = STATUS_MAP[contract.status ?? ''] || { label: contract.status ?? '', variant: 'outline' as const };
        const propertyName = (contract.property_id && propertiesMap[contract.property_id]) || '-';
        return (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{contract.contract_number ?? ''}</p>
                  <p className="text-sm text-muted-foreground truncate">{contract.tenant_name ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={st.variant}>{st.label}</Badge>
                  {isExpiringSoon(contract) && (
                    <Badge variant="outline" className="text-warning border-warning text-[11px]">
                      <AlertTriangle className="w-3 h-3 me-1" />ينتهي قريباً
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">العقار</span>
                <span className="font-medium truncate max-w-[60%] text-end">{propertyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الإيجار</span>
                <span className="font-medium">{fmt(contract.rent_amount ?? 0)} ر.س</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">من</span>
                <span>{fmtDate(contract.start_date ?? '')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إلى</span>
                <span>{fmtDate(contract.end_date ?? '')}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
