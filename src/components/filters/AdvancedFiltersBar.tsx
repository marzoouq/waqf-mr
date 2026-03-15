/**
 * شريط فلاتر متقدمة قابل لإعادة الاستخدام: مصدر/نوع + عقار + نطاق تاريخ.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
  category: string;
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: '',
  propertyId: '',
  dateFrom: '',
  dateTo: '',
};

interface AdvancedFiltersBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: string[];
  categoryLabel: string;
  categoryPlaceholder: string;
  properties: Array<{ id: string; property_number: string; location: string }>;
  className?: string;
}

const AdvancedFiltersBar: React.FC<AdvancedFiltersBarProps> = ({
  filters, onFiltersChange, categories, categoryLabel, categoryPlaceholder, properties, className,
}) => {
  const hasActiveFilters = filters.category || filters.propertyId || filters.dateFrom || filters.dateTo;

  const update = (partial: Partial<FilterState>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>فلاتر متقدمة</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
          >
            <X className="w-3 h-3 ml-1" />
            مسح الكل
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* فلتر المصدر/النوع */}
        <NativeSelect
          value={filters.category}
          onValueChange={(v) => update({ category: v })}
          placeholder={categoryPlaceholder}
          options={[
            { value: '', label: `كل ${categoryLabel}` },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />

        {/* فلتر العقار */}
        <NativeSelect
          value={filters.propertyId}
          onValueChange={(v) => update({ propertyId: v })}
          placeholder="كل العقارات"
          options={[
            { value: '', label: 'كل العقارات' },
            ...properties.map((p) => ({
              value: p.id,
              label: `${p.property_number} - ${p.location}`,
            })),
          ]}
        />

        {/* نطاق التاريخ */}
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          placeholder="من تاريخ"
          className="text-sm"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          placeholder="إلى تاريخ"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default AdvancedFiltersBar;
