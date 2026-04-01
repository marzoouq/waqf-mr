/**
 * صف إصدار عقد واحد داخل الأكورديون (مستخرج من ContractAccordionGroup)
 */
import { Contract } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, RefreshCw } from 'lucide-react';
import { fmt } from '@/utils/format';

interface ContractVersionRowProps {
  contract: Contract;
  statusLabel: string;
  statusClassName: string;
  isExpired: boolean;
  showCheckbox: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onRenew: (contract: Contract) => void;
}

const ContractVersionRow = ({
  contract, statusLabel, statusClassName, isExpired,
  showCheckbox, isSelected, onToggleSelection,
  onEdit, onDelete, onRenew,
}: ContractVersionRowProps) => (
  <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50 transition-colors">
    {showCheckbox && (
      <div className="w-5 flex justify-center">
        {isExpired ? (
          <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelection(contract.id)} />
        ) : null}
      </div>
    )}

    <div className="flex-1 min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 items-center text-sm">
        <span className="font-medium">{contract.contract_number}</span>
        <span className="text-muted-foreground hidden sm:block">{contract.start_date}</span>
        <span className="text-muted-foreground hidden sm:block">{contract.end_date}</span>
        <span className="hidden sm:block">{fmt(Number(contract.rent_amount))} ر.س</span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${statusClassName}`}>
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 sm:hidden text-xs text-muted-foreground">
        <span>{contract.start_date} → {contract.end_date}</span>
        <span className="font-medium text-foreground">{fmt(Number(contract.rent_amount))} ر.س</span>
      </div>
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

export default ContractVersionRow;
