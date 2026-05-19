/**
 * هوك البحث الشامل — orchestration فقط.
 * UI primitives مستخرَجة: useClickOutside / useKeyboardShortcut.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useKeyboardShortcut } from '@/hooks/ui/useKeyboardShortcut';
import { executeGlobalSearch, type SearchResult } from '@/lib/search/globalSearchFn';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';

export type { SearchResult };

export function useGlobalSearch() {
  const { role } = useAuth();
  const { fiscalYearId } = useFiscalYear();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  const isAdmin = role === 'admin' || role === 'accountant';
  const basePath = isAdmin ? '/dashboard' : '/beneficiary';

  const search = useCallback(async (term: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (term.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await executeGlobalSearch(term, { isAdmin, basePath, fiscalYearId }, controller.signal);
      if (controller.signal.aborted) return;
      setResults(searchResults);
    } catch {
      // Fail silently (includes aborted requests)
    } finally {
      if (!abortRef.current?.signal.aborted) setIsLoading(false);
    }
  }, [basePath, isAdmin, fiscalYearId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useClickOutside(containerRef, () => setIsOpen(false));

  useKeyboardShortcut({ key: 'k', modifier: 'ctrlOrMeta' }, () => {
    if (isMobile) {
      setMobileOpen(true);
    } else {
      inputRef.current?.focus();
      setIsOpen(true);
    }
  });

  useKeyboardShortcut({ key: 'Escape', preventDefault: false }, () => {
    setIsOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  });

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setMobileOpen(false);
    setQuery('');
  };

  const handleMobileOpenChange = (open: boolean) => {
    setMobileOpen(open);
    if (!open) {
      setQuery('');
      setResults([]);
    }
  };

  return {
    query, setQuery,
    results, isLoading,
    isOpen, setIsOpen,
    mobileOpen, setMobileOpen,
    isMobile,
    inputRef, mobileInputRef, containerRef,
    handleSelect, handleMobileOpenChange,
  };
}
