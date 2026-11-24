/**
 * لوحة البحث والتصفية الموحّدة لسجلات الدخل والمصروفات (عرض فقط).
 */
import type { ComponentProps } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AdvancedFiltersBar from '@/components/dashboard/AdvancedFiltersBar';

interface RecordsToolbarProps {
  searchId: string;
  searchPlaceholder: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filtersProps: ComponentProps<typeof AdvancedFiltersBar>;
}

const RecordsToolbar = ({ searchId, searchPlaceholder, searchQuery, onSearchChange, filtersProps }: RecordsToolbarProps) => (
  <section aria-label="البحث والتصفية" className="space-y-3 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-bold text-primary">
      <SlidersHorizontal className="h-4 w-4 text-bronze-foreground" aria-hidden="true" />
      البحث والتصفية
    </div>
    <div className="relative">
      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input id={searchId} name={searchId} aria-label="بحث" placeholder={searchPlaceholder} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="h-11 rounded-xl bg-muted/40 ps-10" />
    </div>
    <AdvancedFiltersBar {...filtersProps} />
  </section>
);

export default RecordsToolbar;
