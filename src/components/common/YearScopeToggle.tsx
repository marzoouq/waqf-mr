import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface YearScopeToggleProps {
  allYears: boolean;
  onChange: (allYears: boolean) => void;
  yearLabel?: string;
}

/** مفتاح نطاق العرض: السنة المختارة (افتراضي) أو كل السنوات */
const YearScopeToggle = ({ allYears, onChange, yearLabel }: YearScopeToggleProps) => (
  <div className="flex items-center gap-2 text-sm">
    <Switch id="year-scope" checked={allYears} onCheckedChange={onChange} />
    <Label htmlFor="year-scope" className="cursor-pointer">
      {allYears ? 'عرض كل السنوات' : `السنة المختارة${yearLabel ? ` (${yearLabel})` : ''}`}
    </Label>
  </div>
);

export default YearScopeToggle;
