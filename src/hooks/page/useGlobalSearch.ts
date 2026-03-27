/**
 * هوك البحث الشامل — منطق البحث + debounce + استعلامات Supabase + اختصارات لوحة المفاتيح
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'property' | 'contract' | 'beneficiary' | 'expense';
  path: string;
}

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
      const searchResults: SearchResult[] = [];
      const pattern = `%${term}%`;

      const contractSelectFields = 'id, contract_number, tenant_name, status, fiscal_year_id';
      const contractFilter = `contract_number.ilike.${pattern},tenant_name.ilike.${pattern}`;

      const buildContractQuery = () => {
        if (isAdmin) {
          let q = supabase.from('contracts').select(contractSelectFields).or(contractFilter).limit(5);
          if (fiscalYearId && fiscalYearId !== '__none__') q = q.eq('fiscal_year_id', fiscalYearId);
          return q.abortSignal(controller.signal);
        } else {
          let q = supabase.from('contracts_safe').select(contractSelectFields).or(contractFilter).limit(5);
          if (fiscalYearId && fiscalYearId !== '__none__') q = q.eq('fiscal_year_id', fiscalYearId);
          return q.abortSignal(controller.signal);
        }
      };

      const buildExpensesQuery = () => {
        let q = supabase.from('expenses').select('id, expense_type, description, amount, fiscal_year_id').or(`expense_type.ilike.${pattern},description.ilike.${pattern}`).limit(5);
        if (fiscalYearId && fiscalYearId !== '__none__') q = q.eq('fiscal_year_id', fiscalYearId);
        return q.abortSignal(controller.signal);
      };

      const [propsRes, contractsRes, bensRes, expsRes] = await Promise.all([
        supabase.from('properties').select('id, property_number, property_type, location').or(`property_number.ilike.${pattern},location.ilike.${pattern},property_type.ilike.${pattern}`).limit(5).abortSignal(controller.signal),
        buildContractQuery(),
        isAdmin ? supabase.from('beneficiaries').select('id, name, share_percentage').ilike('name', pattern).limit(5).abortSignal(controller.signal) : Promise.resolve({ data: null as null }),
        isAdmin ? buildExpensesQuery() : Promise.resolve({ data: null as null }),
      ]);

      if (propsRes.data) {
        for (const p of propsRes.data) {
          searchResults.push({ id: p.id, title: `${p.property_number} - ${p.property_type}`, subtitle: p.location, type: 'property', path: `${basePath}/properties` });
        }
      }
      if (contractsRes.data) {
        for (const c of contractsRes.data) {
          searchResults.push({ id: c.id!, title: `عقد ${c.contract_number}`, subtitle: c.tenant_name || `حالة: ${c.status}`, type: 'contract', path: `${basePath}/contracts` });
        }
      }
      if (bensRes.data) {
        for (const b of bensRes.data) {
          searchResults.push({ id: b.id, title: b.name, subtitle: `${b.share_percentage}%`, type: 'beneficiary', path: `${basePath}/beneficiaries` });
        }
      }
      if (expsRes.data) {
        for (const e of expsRes.data) {
          searchResults.push({ id: e.id, title: e.expense_type, subtitle: `${fmt(safeNumber(e.amount))} ر.س${e.description ? ` — ${e.description}` : ''}`, type: 'expense', path: `${basePath}/expenses` });
        }
      }

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
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // إغلاق عند النقر خارج المكون (سطح المكتب)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // اختصار لوحة المفاتيح: Ctrl+K
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
