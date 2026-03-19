/**
 * صفحة التقرير السنوي — المستفيد (قراءة + طباعة + تصدير فقط)
 * تظهر فقط التقارير المنشورة
 */
import { useMemo, useState } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, AlertTriangle, Lightbulb, Building2, FileDown, Printer,
  Loader2, DollarSign, Receipt, FileText, Info,
} from 'lucide-react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import {
  useAnnualReportItems, useReportStatus,
} from '@/hooks/useAnnualReport';
import { useProperties } from '@/hooks/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContracts } from '@/hooks/useContracts';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import ReportItemCard from '@/components/annual-report/ReportItemCard';
import PropertyStatusSection from '@/components/annual-report/PropertyStatusSection';
import IncomeComparisonChart from '@/components/annual-report/IncomeComparisonChart';
import { generateAnnualReportPDF, type AnnualReportPdfData } from '@/utils/pdf/annualReport';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

const AnnualReportViewPage = () => {
  const [viewTab, setViewTab] = useState('property_status');
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const { data: items = [], isLoading } = useAnnualReportItems(fiscalYearId || undefined);
  const { data: reportStatus, isLoading: statusLoading } = useReportStatus(fiscalYearId || undefined);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId || 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId || 'all');
  const { data: contracts = [] } = useContracts();
  const waqfInfo = usePdfWaqfInfo();

  const isPublished = reportStatus?.status === 'published';

  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  const totalIncome = useMemo(() => income.reduce((s, r) => s + safeNumber(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + safeNumber(r.amount), 0), [expenses]);
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = [
    { label: 'إجمالي الدخل', value: formatCurrency(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-emerald-600' },
    { label: 'إجمالي المصروفات', value: formatCurrency(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-red-500' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-blue-600' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-amber-600' },
  ];

  const handleExportPdf = async () => {
    const pdfData: AnnualReportPdfData = {
      fiscalYearLabel: fiscalYear?.label || '',
      achievements: grouped.achievement.map(i => ({ title: i.title, content: i.content })),
      challenges: grouped.challenge.map(i => ({ title: i.title, content: i.content })),
      futurePlans: grouped.future_plan.map(i => ({ title: i.title, content: i.content })),
      propertyStatuses: grouped.property_status.map(i => {
        const prop = properties.find(p => p.id === i.property_id);
        return { title: i.title, content: i.content, propertyName: prop ? `${prop.property_number} — ${prop.location}` : undefined };
      }),
      summaryCards: summaryCards.map(c => ({ label: c.label, value: c.value })),
    };
    await generateAnnualReportPDF(pdfData, waqfInfo);
  };

  if (statusLoading || isLoading) {
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
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" />
              طباعة
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

        <IncomeComparisonChart />

        <Tabs defaultValue={viewTab} value={viewTab} onValueChange={setViewTab} dir="rtl">
          {/* قائمة Select للجوال */}
          <div className="md:hidden mb-4">
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
          <TabsList className="w-full justify-start hidden md:flex">
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
