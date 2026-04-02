/**
 * مكون البحث الشامل (Global Search)
 * يتيح البحث عبر العقارات والعقود والمستفيدين والمصروفات
 * يعمل كحقل بحث على الشاشات الكبيرة وكأيقونة + Dialog على الجوال
 */
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useGlobalSearch } from '@/hooks/page/useGlobalSearch';
import SearchResults from '@/components/search/SearchResults';

const GlobalSearch = () => {
  const {
    query, setQuery,
    results, isLoading,
    isOpen, setIsOpen,
    mobileOpen,
    isMobile,
    inputRef, mobileInputRef, containerRef,
    handleSelect, handleMobileOpenChange,
  } = useGlobalSearch();

  // --- عرض الجوال: زر أيقونة + Dialog ---
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={() => handleMobileOpenChange(true)}
          aria-label="بحث"
        >
          <Search className="w-5 h-5" />
        </Button>

        <Dialog open={mobileOpen} onOpenChange={handleMobileOpenChange}>
          <DialogContent className="max-w-full h-[80dvh] p-0 gap-0 flex flex-col [&>button]:hidden">
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input name="query" id="global-search-field-1" ref={mobileInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث في العقارات والعقود..."
                className="border-0 shadow-none focus-visible:ring-0 h-9 text-sm"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0"
                  onClick={() => { setQuery(''); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {query.length >= 2 ? (
                <SearchResults isLoading={isLoading} results={results} query={query} onSelect={handleSelect} />
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  اكتب حرفين على الأقل للبحث
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // --- عرض سطح المكتب ---
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input name="query" id="global-search-field-2" ref={inputRef}
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
            onClick={() => { setQuery(''); }}
            aria-label="مسح البحث"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 right-0 w-80 xl:w-96 bg-popover border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          <SearchResults isLoading={isLoading} results={results} query={query} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
