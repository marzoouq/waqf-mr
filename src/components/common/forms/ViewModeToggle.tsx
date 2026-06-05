/**
 * مفتاح تبديل وضع العرض (جدول / شبكي) — مع حفظ التفضيل في sessionStorage
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'table' | 'grid';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div className={`flex gap-1 border rounded-lg p-1 ${className ?? ''}`}>
      <Button
        variant={value === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        className="gap-1"
        aria-pressed={value === 'table'}
        aria-label="عرض جدول"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">جدول</span>
      </Button>
      <Button
        variant={value === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="gap-1"
        aria-pressed={value === 'grid'}
        aria-label="عرض شبكي"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">شبكي</span>
      </Button>
    </div>
  );
}

/** هوك يحفظ تفضيل وضع العرض في sessionStorage */
export function useViewMode(storageKey: string, initial: ViewMode = 'table'): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return initial;
    const saved = window.sessionStorage.getItem(`viewMode:${storageKey}`);
    return saved === 'grid' || saved === 'table' ? saved : initial;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(`viewMode:${storageKey}`, mode);
  }, [storageKey, mode]);

  return [mode, setMode];
}
