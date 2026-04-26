/**
 * هوك البحث الشامل — منطق البحث + debounce + اختصارات لوحة المفاتيح
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isMobile) {
          setMobileOpen(true);
        } else {
          inputRef.current?.focus();
          setIsOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setMobileOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMobile]);

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
