/**
 * قائمة نتائج البحث المشتركة بين Desktop و Mobile
 */
import { Loader2, Building2, FileText, Users, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { SearchResult } from '@/hooks/page/shared/useGlobalSearch';

const TYPE_CONFIG = {
  property: { icon: Building2, label: 'عقار', color: 'bg-primary/10 text-primary' },
  contract: { icon: FileText, label: 'عقد', color: 'bg-accent/10 text-accent-foreground' },
  beneficiary: { icon: Users, label: 'مستفيد', color: 'bg-secondary/10 text-secondary' },
  expense: { icon: Receipt, label: 'مصروف', color: 'bg-muted text-muted-foreground' },
};

interface SearchResultsProps {
  isLoading: boolean;
  results: SearchResult[];
  query: string;
  onSelect: (r: SearchResult) => void;
}

export default function SearchResults({ isLoading, results, query, onSelect }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        لا توجد نتائج لـ &quot;{query}&quot;
      </div>
    );
  }
  return (
    <div className="py-1">
      {results.map((result) => {
        const config = TYPE_CONFIG[result.type];
        const Icon = config.icon;
        return (
          <button
            key={`${result.type}-${result.id}`}
            onClick={() => onSelect(result)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-right"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{result.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
            </div>
            <Badge variant="outline" className="text-[11px] shrink-0 hidden sm:inline-flex">{config.label}</Badge>
          </button>
        );
      })}
    </div>
  );
}
