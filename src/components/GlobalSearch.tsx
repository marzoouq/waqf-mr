/**
 * مكون البحث الشامل (Global Search)
 * يتيح البحث عبر العقارات والعقود والمستفيدين والمصروفات
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, FileText, Users, Receipt, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'property' | 'contract' | 'beneficiary' | 'expense';
  path: string;
}

const TYPE_CONFIG = {
  property: { icon: Building2, label: 'عقار', color: 'bg-primary/10 text-primary' },
  contract: { icon: FileText, label: 'عقد', color: 'bg-accent/10 text-accent-foreground' },
  beneficiary: { icon: Users, label: 'مستفيد', color: 'bg-secondary/10 text-secondary' },
  expense: { icon: Receipt, label: 'مصروف', color: 'bg-muted text-muted-foreground' },
};

const GlobalSearch = () => {
  const { role } = useAuth();
  const { fiscalYearId } = useFiscalYear();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const isAdmin = role === 'admin' || role === 'accountant';
  const basePath = isAdmin ? '/dashboard' : '/beneficiary';

  const search = useCallback(async (term: string) => {
    // إلغاء أي طلب بحث سابق لمنع race condition
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

      // Search properties
      const { data: props } = await supabase
        .from('properties')
        .select('id, property_number, property_type, location')
        .or(`property_number.ilike.${pattern},location.ilike.${pattern},property_type.ilike.${pattern}`)
        .limit(5)
        .abortSignal(controller.signal);

      if (props) {
        for (const p of props) {
          searchResults.push({
            id: p.id,
            title: `${p.property_number} - ${p.property_type}`,
            subtitle: p.location,
            type: 'property',
            path: `${basePath}/properties`,
          });
        }
      }

      // Search contracts — hide tenant_name from non-admin, filter by fiscal_year
      let contractsQuery = supabase
        .from('contracts')
        .select('id, contract_number, tenant_name, status, fiscal_year_id')
        .or(`contract_number.ilike.${pattern},tenant_name.ilike.${pattern}`)
        .limit(5);

      // Filter by fiscal year if a specific one is selected
      if (fiscalYearId && fiscalYearId !== '__none__') {
        contractsQuery = contractsQuery.eq('fiscal_year_id', fiscalYearId);
      }

      const { data: contracts } = await contractsQuery.abortSignal(controller.signal);

      if (contracts) {
        for (const c of contracts) {
          searchResults.push({
            id: c.id,
            title: `عقد ${c.contract_number}`,
            // إظهار اسم المستأجر لجميع الأدوار حسب طلب الإفصاح
            subtitle: c.tenant_name || `حالة: ${c.status}`,
            type: 'contract',
            path: `${basePath}/contracts`,
          });
        }
      }

      // Search beneficiaries & expenses (admin/accountant only)
      if (isAdmin) {
        const { data: bens } = await supabase
          .from('beneficiaries')
          .select('id, name, share_percentage')
          .ilike('name', pattern)
          .limit(5)
          .abortSignal(controller.signal);

        if (bens) {
          for (const b of bens) {
            searchResults.push({
              id: b.id,
              title: b.name,
              subtitle: `${b.share_percentage}%`,
              type: 'beneficiary',
              path: `${basePath}/beneficiaries`,
            });
          }
        }

        // Search expenses
        let expensesQuery = supabase
          .from('expenses')
          .select('id, expense_type, description, amount, fiscal_year_id')
          .or(`expense_type.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5);

        if (fiscalYearId && fiscalYearId !== '__none__') {
          expensesQuery = expensesQuery.eq('fiscal_year_id', fiscalYearId);
        }

        const { data: exps } = await expensesQuery.abortSignal(controller.signal);

        if (exps) {
          for (const e of exps) {
            searchResults.push({
              id: e.id,
              title: e.expense_type,
              subtitle: `${Number(e.amount).toLocaleString()} ر.س${e.description ? ` — ${e.description}` : ''}`,
              type: 'expense',
              path: `${basePath}/expenses`,
            });
          }
        }
      }

      // تجاهل النتائج إذا تم إلغاء الطلب
      if (controller.signal.aborted) return;
      setResults(searchResults);
    } catch {
      // Fail silently (includes aborted requests)
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [basePath, isAdmin, fiscalYearId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="بحث... (Ctrl+K)"
          className="w-56 xl:w-72 pr-9 pl-8 h-9 text-sm bg-muted/50 border-border/50 focus:bg-background"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6"
            onClick={() => { setQuery(''); setResults([]); }}
            aria-label="مسح البحث"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 right-0 w-80 xl:w-96 bg-popover border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              لا توجد نتائج لـ "{query}"
            </div>
          ) : (
            <div className="py-1">
              {results.map((result) => {
                const config = TYPE_CONFIG[result.type];
                const Icon = config.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-right"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{config.label}</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
