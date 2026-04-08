/**
 * صفحة التقرير السنوي — الناظر (admin/accountant)
 */
import { lazy, Suspense } from 'react';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, AlertTriangle, Lightbulb, Building2, FileDown, Printer,
  Send, FileEdit, Loader2, Plus,
} from 'lucide-react';
import type { SectionType } from '@/hooks/data/content/useAnnualReport';
import ReportItemCard from '@/components/annual-report/ReportItemCard';
import ReportItemFormDialog from '@/components/annual-report/ReportItemFormDialog';
import PropertyStatusSection from '@/components/annual-report/PropertyStatusSection';
const IncomeComparisonChart = lazy(() => import('@/components/annual-report/IncomeComparisonChart'));
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAnnualReportPage } from '@/hooks/page/admin/useAnnualReportPage';

const AnnualReportPage = () => {
  const isMobile = useIsMobile();
  const r = useAnnualReportPage();

  // عرض قسم عادي (إنجازات/تحديات/خطط)
  const renderSection = (type: SectionType) => {
    const sectionItems = r.grouped[type] || [];
    return (
      <div className="space-y-3">
        <Button
          variant="outline" size="sm" className="gap-1.5"
          onClick={() => { r.setEditingItem(null); r.setDialogOpen(true); }}
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
            onEdit={() => { r.setEditingItem(item); r.setDialogOpen(true); }}
            onDelete={() => r.setDeleteTarget(item.id)}
            onMoveUp={() => r.handleReorder(item.id, 'up')}
            onMoveDown={() => r.handleReorder(item.id, 'down')}
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
            description={`تقرير إنجازات السنة المالية ${r.fiscalYear?.label || ''}`}
          />
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <Badge variant={r.isPublished ? 'default' : 'secondary'} className="text-xs">
              {r.isPublished ? 'منشور' : 'مسودة'}
            </Badge>
            <Button
              variant={r.isPublished ? 'outline' : 'default'}
              size="sm"
              onClick={r.handleTogglePublish}
              disabled={r.togglePublish.isPending}
              className="gap-1.5"
            >
              {r.isPublished ? <FileEdit className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {r.isPublished ? 'إرجاع للمسودة' : 'نشر التقرير'}
            </Button>
            <Button variant="outline" size="sm" onClick={r.handleExportPdf} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={r.handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>

        {/* بطاقات ملخصة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {r.summaryCards.map(card => (
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
        <Suspense fallback={null}>
          <IncomeComparisonChart />
        </Suspense>

        {/* التبويبات */}
        {r.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={r.activeTab} onValueChange={r.setActiveTab} dir="rtl">
            {isMobile ? (
              <div className="mb-4">
                <select
                  value={r.activeTab}
                  onChange={(e) => r.setActiveTab(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="property_status">حالة العقارات ({r.grouped.property_status.length})</option>
                  <option value="achievement">الإنجازات ({r.grouped.achievement.length})</option>
                  <option value="challenge">التحديات ({r.grouped.challenge.length})</option>
                  <option value="future_plan">الخطط المستقبلية ({r.grouped.future_plan.length})</option>
                </select>
              </div>
            ) : (
              <TabsList className="w-full justify-start">
                <TabsTrigger value="property_status" className="gap-1 text-sm">
                  <Building2 className="h-4 w-4" />
                  حالة العقارات
                  <Badge variant="secondary" className="mr-1 text-xs">{r.grouped.property_status.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="achievement" className="gap-1 text-sm">
                  <Trophy className="h-4 w-4" />
                  الإنجازات
                  <Badge variant="secondary" className="mr-1 text-xs">{r.grouped.achievement.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="challenge" className="gap-1 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  التحديات
                  <Badge variant="secondary" className="mr-1 text-xs">{r.grouped.challenge.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="future_plan" className="gap-1 text-sm">
                  <Lightbulb className="h-4 w-4" />
                  الخطط المستقبلية
                  <Badge variant="secondary" className="mr-1 text-xs">{r.grouped.future_plan.length}</Badge>
                </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="property_status">
              <PropertyStatusSection
                items={r.grouped.property_status}
                properties={r.propertiesList}
                onAdd={() => { r.setEditingItem(null); r.setDialogOpen(true); }}
                onEdit={(item) => { r.setEditingItem(item); r.setDialogOpen(true); }}
                onDelete={(id) => r.setDeleteTarget(id)}
                onReorder={r.handleReorder}
              />
            </TabsContent>
            <TabsContent value="achievement">{renderSection('achievement')}</TabsContent>
            <TabsContent value="challenge">{renderSection('challenge')}</TabsContent>
            <TabsContent value="future_plan">{renderSection('future_plan')}</TabsContent>
          </Tabs>
        )}

        {/* ديالوج الإضافة/التعديل */}
        <ReportItemFormDialog
          open={r.dialogOpen}
          onOpenChange={(open) => { r.setDialogOpen(open); if (!open) r.setEditingItem(null); }}
          item={r.editingItem}
          sectionType={r.activeTab as SectionType}
          properties={r.propertiesList}
          onSubmit={r.handleSubmit}
          isPending={r.createItem.isPending || r.updateItem.isPending}
        />

        {/* تأكيد الحذف */}
        <AlertDialog open={!!r.deleteTarget} onOpenChange={(o) => !o && r.setDeleteTarget(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (r.deleteTarget) { r.deleteItem.mutate(r.deleteTarget); r.setDeleteTarget(null); } }}
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
