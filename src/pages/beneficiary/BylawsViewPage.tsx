import { lazy, Suspense } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, X, Lock, ScrollText, Scale, AlertCircle, RefreshCw } from 'lucide-react';
const ReactMarkdown = lazy(() => import('react-markdown'));
import { ExportMenu, TableSkeleton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useBylawsViewPage } from '@/hooks/page/beneficiary';

const BylawsViewPage = () => {
  const {
    isLoading, isError, isPublished,
    search, setSearch,
    visibleBylaws, groupedByPart, partNumbers,
    handleRetry, handleExportPdf,
  } = useBylawsViewPage();

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل اللائحة</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <TableSkeleton rows={6} cols={2} />
        </div>
      </DashboardLayout>
    );
  }

  if (!isPublished) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">اللائحة غير متاحة حالياً</h2>
            <p className="text-muted-foreground max-w-md">
              اللائحة التنظيمية غير منشورة حالياً. سيتم إشعارك عند نشرها من قبل ناظر الوقف.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard
          title="اللائحة التنظيمية"
          description={`لائحة تنظيم أعمال الوقف والنظارة • ${visibleBylaws.length} بند`}
          icon={Scale}
          actions={<ExportMenu onExportPdf={handleExportPdf} />}
        />

        {/* البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input name="search" placeholder="ابحث في بنود اللائحة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 pl-9" dir="rtl" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* فهرس اللائحة */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="w-5 h-5 text-primary" />
              فهرس اللائحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleBylaws.map((item) => (
                <a key={item.id} href={`#bylaw-${item.id}`} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm group">
                  <Badge variant="outline" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors min-w-10 justify-center">
                    {item.part_number === 0 ? '٠' : item.part_number}
                  </Badge>
                  <span className="truncate text-foreground/80 group-hover:text-foreground transition-colors">
                    {item.chapter_title || item.part_title}
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* محتوى اللائحة */}
        {partNumbers.map((partNum) => {
          const items = groupedByPart[partNum] ?? [];
          const partTitle = partNum === 0 ? 'المقدمة' : items[0]?.part_title || `الجزء ${partNum}`;

          return (
            <div key={partNum} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{partNum === 0 ? '٠' : partNum}</span>
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">{partTitle}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Card>
                <CardContent className="pt-4 pb-2">
                  <Accordion type="multiple" defaultValue={items.map((b) => b.id)} className="space-y-1">
                    {items.map((item) => (
                      <AccordionItem key={item.id} value={item.id} id={`bylaw-${item.id}`} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 text-right">
                            {item.chapter_title && item.chapter_title !== item.part_title && (
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                فصل {item.chapter_number || ''}
                              </Badge>
                            )}
                            <span className="font-semibold text-sm">
                              {item.chapter_title || item.part_title}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-right leading-relaxed py-3 prose-headings:text-primary prose-strong:text-foreground" dir="rtl">
                            <Suspense fallback={<div className="animate-pulse h-4 bg-muted rounded" />}><ReactMarkdown>{item.content}</ReactMarkdown></Suspense>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default BylawsViewPage;
