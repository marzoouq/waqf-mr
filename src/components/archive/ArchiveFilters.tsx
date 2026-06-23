/**
 * فلاتر قائمة الأرشيف — فئة + بحث نصي.
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { ARCHIVE_CATEGORIES, ARCHIVE_CATEGORY_LABELS } from '@/types/archive';
import type { CategoryFilter } from '@/hooks/page/admin/management/useArchivePage';

interface Props {
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

const ArchiveFilters = ({ category, onCategoryChange, search, onSearchChange }: Props) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          name="archive-search"
          aria-label="بحث في الأرشيف"
          placeholder="ابحث في عناوين الوثائق والوصف..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9 pe-9"
          dir="rtl"
        />
        {search && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => onSearchChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Select value={category} onValueChange={(v) => onCategoryChange(v as CategoryFilter)}>
        <SelectTrigger className="w-full sm:w-56" aria-label="تصفية حسب التصنيف">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل التصنيفات</SelectItem>
          {ARCHIVE_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {ARCHIVE_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ArchiveFilters;
