import DashboardLayout from '@/components/DashboardLayout';
import { useBylaws } from '@/hooks/useBylaws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ExportMenu from '@/components/ExportMenu';
import { generateBylawsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';

const BylawsViewPage = () => {
  const { data: bylaws, isLoading } = useBylaws();
  const pdfWaqfInfo = usePdfWaqfInfo();

  // Only show visible items for beneficiaries
  const visibleBylaws = (bylaws || []).filter((b) => b.is_visible);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">اللائحة التنظيمية</h1>
              <p className="text-sm text-muted-foreground">لائحة تنظيم أعمال الوقف والنظارة</p>
            </div>
          </div>
          <ExportMenu
            onExportPdf={() => generateBylawsPDF(visibleBylaws, pdfWaqfInfo)}
          />
        </div>
        {/* Table of Contents */}
        <Card>
          <CardHeader>
            <CardTitle>فهرس اللائحة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visibleBylaws.map((item) => (
                <a
                  key={item.id}
                  href={`#bylaw-${item.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <Badge variant="outline" className="shrink-0">
                    {item.part_number === 0 ? 'مقدمة' : `${item.part_number}`}
                  </Badge>
                  <span className="truncate">{item.chapter_title || item.part_title}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bylaws Content */}
        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" defaultValue={visibleBylaws.map((b) => b.id)} className="space-y-2">
              {visibleBylaws.map((item) => (
                <AccordionItem key={item.id} value={item.id} id={`bylaw-${item.id}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-right">
                      <Badge variant="default" className="shrink-0">
                        {item.part_number === 0 ? 'مقدمة' : `جزء ${item.part_number}`}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {item.chapter_title || item.part_title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-right leading-relaxed py-2" dir="rtl">
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BylawsViewPage;
