/**
 * صفحة التقرير السنوي — الناظر (admin/accountant)
 * تتضمن: ملخص تلقائي + مقارنة دخل + 4 تبويبات CRUD + نشر
 */
import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, AlertTriangle, Lightbulb, Building2, FileDown, Printer,
  Send, FileEdit, Loader2, Plus, DollarSign, Receipt, FileText,
} from 'lucide-react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import {
  useAnnualReportItems, useCreateReportItem, useUpdateReportItem,
  useDeleteReportItem, useReportStatus, useToggleReportPublish,
  type AnnualReportItem, type SectionType,
} from '@/hooks/useAnnualReport';
import { useProperties } from '@/hooks/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import ReportItemCard from '@/components/annual-report/ReportItemCard';
import ReportItemFormDialog from '@/components/annual-report/ReportItemFormDialog';
import PropertyStatusSection from '@/components/annual-report/PropertyStatusSection';
import IncomeComparisonChart from '@/components/annual-report/IncomeComparisonChart';
import { generateAnnualReportPDF, type AnnualReportPdfData } from '@/utils/pdf/annualReport';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

const AnnualReportPage = () => {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const { data: items = [], isLoading } = useAnnualReportItems(fiscalYearId || undefined);
  const { data: reportStatus } = useReportStatus(fiscalYearId || undefined);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId || 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId || 'all');
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
  const waqfInfo = usePdfWaqfInfo();

  const createItem = useCreateReportItem();
  const updateItem = useUpdateReportItem();
  const deleteItem = useDeleteReportItem();
  const togglePublish = useToggleReportPublish();

  const [activeTab, setActiveTab] = useState('property_status');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnualReportItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isPublished = reportStatus?.status === 'published';

  // تصنيف العناصر حسب النوع
  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  // بطاقات ملخصة
  const totalIncome = useMemo(() => income.reduce((s, r) => s + safeNumber(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + safeNumber(r.amount), 0), [expenses]);
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = [
    { label: 'إجمالي الدخل', value: formatCurrency(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-emerald-600' },
    { label: 'إجمالي المصروفات', value: formatCurrency(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-red-500' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-blue-600' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-amber-600' },
  ];

  // إضافة/تعديل عنصر
  const handleSubmit = useCallback((data: { title: string; content: string; section_type: SectionType; property_id?: string | null }) => {
    if (!fiscalYearId) return;
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...data }, {
        onSuccess: () => { setDialogOpen(false); setEditingItem(null); },
      });
    } else {
      const sectionItems = grouped[data.section_type as keyof typeof grouped] || [];
      createItem.mutate({
        fiscal_year_id: fiscalYearId,
        title: data.title,
        content: data.content,
        section_type: data.section_type,
        property_id: data.property_id ?? null,
        sort_order: sectionItems.length,
      }, { onSuccess: () => { setDialogOpen(false); } });
    }
  }, [fiscalYearId, editingItem, grouped, createItem, updateItem]);

  // إعادة الترتيب — mutateAsync متتابع لتجنب race condition
  const handleReorder = useCallback(async (id: string, direction: 'up' | 'down') => {
    const sectionItems = grouped[activeTab as keyof typeof grouped];
    if (!sectionItems) return;
    const idx = sectionItems.findIndex(i => i.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sectionItems.length) return;
    try {
      await updateItem.mutateAsync({ id: sectionItems[idx].id, sort_order: sectionItems[swapIdx].sort_order });
      await updateItem.mutateAsync({ id: sectionItems[swapIdx].id, sort_order: sectionItems[idx].sort_order });
    } catch {
      // خطأ يُعالج في onError الخاص بالـ mutation
    }
  }, [grouped, activeTab, updateItem]);

  // تصدير PDF
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

  // طباعة
  const handlePrint = () => window.print();

  // نشر/إلغاء نشر
  const handleTogglePublish = () => {
    if (!fiscalYearId) return;
    togglePublish.mutate({ fiscalYearId, publish: !isPublished });
  };

  // عرض قسم عادي (إنجازات/تحديات/خطط)
  const renderSection = (type: SectionType) => {
    const sectionItems = grouped[type] || [];
    return (
      <div className="space-y-3">
        <Button
          variant="outline" size="sm" className="gap-1.5"
          onClick={() => { setEditingItem(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          إضافة {type === 'achievement' ? 'إنجاز' : type === 'challenge' ? 'تحدي' : 'خطة'}
        </Button>
        {sectionItems.length === 0 && (
          <p className="text-muted-foreground text-center py-8">لا توجد عناصر بعد</p>
        )}
        {sectionItems.map((item, idx) => (
          <ReportItemCard
            key={item.id}
            item={item}
            isFirst={idx === 0}
            isLast={idx === sectionItems.length - 1}
            onEdit={() => { setEditingItem(item); setDialogOpen(true); }}
            onDelete={() => setDeleteTarget(item.id)}
            onMoveUp={() => handleReorder(item.id, 'up')}
            onMoveDown={() => handleReorder(item.id, 'down')}
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4">
        {/* ترويسة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <PageHeaderCard
            title="التقرير السنوي"
            icon={Trophy}
            description={`تقرير إنجازات السنة المالية ${fiscalYear?.label || ''}`}
          />
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <Badge variant={isPublished ? 'default' : 'secondary'} className="text-xs">
              {isPublished ? 'منشور' : 'مسودة'}
            </Badge>
            <Button
              variant={isPublished ? 'outline' : 'default'}
              size="sm"
              onClick={handleTogglePublish}
              disabled={togglePublish.isPending}
              className="gap-1.5"
            >
              {isPublished ? <FileEdit className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {isPublished ? 'إرجاع للمسودة' : 'نشر التقرير'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
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

        {/* مقارنة الدخل */}
        <IncomeComparisonChart />

        {/* التبويبات */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            {/* قائمة Select للجوال */}
            <div className="md:hidden mb-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="property_status">حالة العقارات ({grouped.property_status.length})</option>
                <option value="achievement">الإنجازات ({grouped.achievement.length})</option>
                <option value="challenge">التحديات ({grouped.challenge.length})</option>
                <option value="future_plan">الخطط المستقبلية ({grouped.future_plan.length})</option>
              </select>
            </div>
            {/* تبويبات للشاشات الكبيرة */}
            <TabsList className="w-full justify-start hidden md:flex">
              <TabsTrigger value="property_status" className="gap-1 text-sm">
                <Building2 className="h-4 w-4" />
                حالة العقارات
                <Badge variant="secondary" className="mr-1 text-xs">{grouped.property_status.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="achievement" className="gap-1 text-sm">
                <Trophy className="h-4 w-4" />
                الإنجازات
                <Badge variant="secondary" className="mr-1 text-xs">{grouped.achievement.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="challenge" className="gap-1 text-sm">
                <AlertTriangle className="h-4 w-4" />
                التحديات
                <Badge variant="secondary" className="mr-1 text-xs">{grouped.challenge.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="future_plan" className="gap-1 text-sm">
                <Lightbulb className="h-4 w-4" />
                الخطط المستقبلية
                <Badge variant="secondary" className="mr-1 text-xs">{grouped.future_plan.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="property_status">
              <PropertyStatusSection
                items={grouped.property_status}
                properties={properties.map(p => ({ id: p.id, property_number: p.property_number, location: p.location }))}
                onAdd={() => { setEditingItem(null); setDialogOpen(true); }}
                onEdit={(item) => { setEditingItem(item); setDialogOpen(true); }}
                onDelete={(id) => setDeleteTarget(id)}
                onReorder={handleReorder}
              />
            </TabsContent>
            <TabsContent value="achievement">{renderSection('achievement')}</TabsContent>
            <TabsContent value="challenge">{renderSection('challenge')}</TabsContent>
            <TabsContent value="future_plan">{renderSection('future_plan')}</TabsContent>
          </Tabs>
        )}

        {/* ديالوج الإضافة/التعديل */}
        <ReportItemFormDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null); }}
          item={editingItem}
          sectionType={activeTab as SectionType}
          properties={properties.map(p => ({ id: p.id, property_number: p.property_number, location: p.location }))}
          onSubmit={handleSubmit}
          isPending={createItem.isPending || updateItem.isPending}
        />

        {/* تأكيد الحذف */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deleteTarget) { deleteItem.mutate(deleteTarget); setDeleteTarget(null); } }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AnnualReportPage;
