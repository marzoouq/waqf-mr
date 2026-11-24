/**
 * شبكة بطاقات العقود — المستفيد (وضع شبكي على الكمبيوتر)
 * تعيد استخدام بطاقة الجوال نفسها داخل شبكة.
 */
import ContractsViewMobileCards from './ContractsViewMobileCards';
import type { ContractItem } from './contractsViewShared';

interface ContractsViewGridCardsProps {
  contracts: ContractItem[];
  propertiesMap: Record<string, string>;
  isExpiringSoon: (c: { status: string | null; end_date: string | null }) => boolean;
}

export default function ContractsViewGridCards(props: ContractsViewGridCardsProps) {
  return (
    <div className="[&>ul]:grid [&>ul]:grid-cols-2 [&>ul]:gap-3 [&>ul]:space-y-0 xl:[&>ul]:grid-cols-3">
      <ContractsViewMobileCards {...props} />
    </div>
  );
}
