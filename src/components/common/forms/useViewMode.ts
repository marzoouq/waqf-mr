/** هوك يحفظ تفضيل وضع العرض في sessionStorage — مستخرج من ViewModeToggle.tsx لدعم Fast Refresh */
import { useEffect, useState } from 'react';
import type { ViewMode } from './ViewModeToggle';

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
