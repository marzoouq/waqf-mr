/**
 * صفحة التقرير السنوي — المستفيد (قراءة + طباعة + تصدير فقط)
 */
import { lazy, Suspense } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, AlertTriangle, Lightbulb, Building2, FileDown, Printer,
  Loader2, FileSpreadsheet, Info,
} from 'lucide-react';
import ReportItemCard from '@/components/annual-report/ReportItemCard';
import PropertyStatusSection from '@/components/annual-report/PropertyStatusSection';
const IncomeComparisonChart = lazy(() => import('@/components/annual-report/IncomeComparisonChart'));
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnnualReportViewPage } from '@/hooks/page/beneficiary';

const AnnualReportViewPage = () => {
  const {
    isLoading, isPublished, isMobile,
    viewTab, setViewTab,
    grouped, summaryCards, properties,
    fiscalYear,
    handleExportPdf, handleExportCsv,
  } = useAnnualReportViewPage();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isPublished) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeaderCard title="التقرير السنوي" icon={Trophy} description="تقرير إنجازات السنة المالية" />
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>لم يتم نشر التقرير السنوي لهذه السنة المالية بعد.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <PageHeaderCard
            title="التقرير السنوي"
            icon={Trophy}
            description={`تقرير إنجازات السنة المالية ${fiscalYear?.label || ''}`}
          />
          <div className="flex items-center gap-2 print:hidden">
            <Badge variant="default" className="text-xs">منشور</Badge>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
              <FileDown className="h-4 w-4" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" />طباعة
            </Button>
          </div>
        </div>

        {/* بطاقات ملخصة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(card => (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <card.icon className={`h-8 w-8 ${card.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Suspense fallback={null}>
          <IncomeComparisonChart />
        </Suspense>

        <Tabs defaultValue={viewTab} value={viewTab} onValueChange={setViewTab} dir="rtl">
          {isMobile ? (
            <div className="mb-4">
              <select
                value={viewTab}
                onChange={(e) => setViewTab(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="property_status">حالة العقارات</option>
                <option value="achievement">الإنجازات</option>
                <option value="challenge">التحديات</option>
                <option value="future_plan">الخطط المستقبلية</option>
              </select>
            </div>
          ) : (
            <TabsList className="w-full justify-start">
              <TabsTrigger value="property_status" className="gap-1 text-sm">
                <Building2 className="h-4 w-4" /> حالة العقارات
              </TabsTrigger>
              <TabsTrigger value="achievement" className="gap-1 text-sm">
                <Trophy className="h-4 w-4" /> الإنجازات
              </TabsTrigger>
              <TabsTrigger value="challenge" className="gap-1 text-sm">
                <AlertTriangle className="h-4 w-4" /> التحديات
              </TabsTrigger>
              <TabsTrigger value="future_plan" className="gap-1 text-sm">
                <Lightbulb className="h-4 w-4" /> الخطط المستقبلية
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="property_status">
            <PropertyStatusSection
              items={grouped.property_status}
              properties={properties.map(p => ({ id: p.id, property_number: p.property_number, location: p.location }))}
              readOnly
            />
          </TabsContent>
          {(['achievement', 'challenge', 'future_plan'] as const).map(type => (
            <TabsContent key={type} value={type}>
              <div className="space-y-3">
                {grouped[type].length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد عناصر</p>
                ) : (
                  grouped[type].map(item => (
                    <ReportItemCard key={item.id} item={item} readOnly />
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AnnualReportViewPage;
