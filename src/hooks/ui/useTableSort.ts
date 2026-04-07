/**
 * هوك مشترك لمنطق الفرز في الجداول — يُغني عن تكرار handleSort في كل صفحة
 */
import { useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';

export function useTableSort<T extends string>(defaultField?: T | null, defaultDir: SortDir = 'desc') {
  const [sortField, setSortField] = useState<T | null>(defaultField ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const handleSort = useCallback((field: T) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(defaultDir);
      return field;
    });
  }, [defaultDir]);

  return { sortField, sortDir, handleSort } as const;
}
