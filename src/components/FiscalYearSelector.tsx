import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalYears, FiscalYear } from '@/hooks/useFiscalYears';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FiscalYearSelectorProps {
  value: string; // fiscal_year_id or 'all'
  onChange: (value: string) => void;
  showAll?: boolean;
}

const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({ value, onChange, showAll = true }) => {
  const { data: fiscalYears = [], isLoading } = useFiscalYears();

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="السنة المالية" />
        </SelectTrigger>
        <SelectContent>
          {showAll && <SelectItem value="all">جميع السنوات</SelectItem>}
          {fiscalYears.map((fy) => (
            <SelectItem key={fy.id} value={fy.id}>
              <span className="flex items-center gap-2">
                {fy.label}
                {fy.status === 'active' && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">نشطة</Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FiscalYearSelector;
