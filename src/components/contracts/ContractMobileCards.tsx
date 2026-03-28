/**
 * بطاقات العقود للجوال — مستخرجة من ContractsViewPage
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

interface ContractItem {
  id: string | null;
  contract_number: string | null;
  tenant_name: string | null;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

interface ContractMobileCardsProps {
  contracts: ContractItem[];
  isExpiringSoon: (c: { status: string | null; end_date: string | null }) => boolean;
}

const ContractMobileCards = ({ contracts, isExpiringSoon }: ContractMobileCardsProps) => (
  <div className="space-y-3 md:hidden">
    {contracts.map(contract => {
      const st = statusMap[contract.status ?? ''] || { label: contract.status ?? '', variant: 'outline' as const };
      return (
        <Card key={contract.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-foreground">{contract.contract_number ?? ''}</p>
                <p className="text-sm text-muted-foreground">{contract.tenant_name ?? ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={st.variant}>{st.label}</Badge>
                {isExpiringSoon(contract) && (
                  <Badge variant="outline" className="text-warning border-warning text-[11px]">
                    <AlertTriangle className="w-3 h-3 ml-1" />ينتهي قريباً
                  </Badge>
                )}
              </div>
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

export default ContractMobileCards;
