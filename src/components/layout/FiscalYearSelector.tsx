import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalYears } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import { Calendar, Lock } from 'lucide-react';

interface FiscalYearSelectorProps {
  value: string; // fiscal_year_id or 'all'
  onChange: (value: string) => void;
  showAll?: boolean;
}

/** شارة حالة السنة — مقفلة بقفل برونزي، نشطة بأخضر هادئ */
const StatusChip = ({ status }: { status: string }) => {
  if (status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-bronze-line bg-bronze-soft px-2 py-0.5 text-[11px] font-bold text-bronze-foreground">
        <Lock className="w-3 h-3" aria-hidden="true" />مقفلة
      </span>
    );
  }
  if (status === 'active') {
    return <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-bold text-success-foreground">نشطة</span>;
  }
  return null;
};

const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({ value, onChange, showAll = true }) => {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();

  if (isLoading) return <div className="h-10 w-[200px] rounded-xl bg-muted animate-pulse" />;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="السنة المالية" className="h-10 w-auto min-w-[176px] gap-2 rounded-xl bg-card font-bold">
        <Calendar className="w-4 h-4 text-bronze shrink-0" aria-hidden="true" />
        <SelectValue placeholder="السنة المالية" />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">جميع السنوات</SelectItem>}
        {fiscalYears.map((fy) => (
          <SelectItem key={fy.id} value={fy.id}>
            <span className="flex items-center gap-2">
              <bdi dir="ltr" className="num">{fy.label}</bdi>
              <StatusChip status={fy.status} />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default FiscalYearSelector;
