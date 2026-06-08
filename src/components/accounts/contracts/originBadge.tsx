import { Badge } from '@/components/ui/badge';
import { classifyContractOrigin } from '@/utils/financial/contracts/contractClassification';

export const originBadge = (kind: ReturnType<typeof classifyContractOrigin>) => {
  if (kind === 'fromPrevious') return <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/40">مُرحّل</Badge>;
  if (kind === 'inYear') return <Badge variant="secondary" className="text-[10px]">جديد</Badge>;
  return null;
};
