/**
 * صفحة إفصاح مصروفات الوقف — لوحة المستفيد/الواقف.
 * ملخّص إفصاحي فقط: بطاقات إجماليات + مخطط توزيع + تصدير.
 * الجدول التشغيلي والفلاتر المتقدمة محصورة بلوحة الناظر.
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { ExportMenu, RequirePublishedYears } from '@/components/common';
import { TrendingDown, Info } from 'lucide-react';
import { ExpenseSummaryCards, ExpensesPieChart } from '@/components/expenses';
import { useExpensesViewPage } from '@/hooks/page/beneficiary';

const ExpensesViewPage = () => {
  const h = useExpensesViewPage();

  return (
    <RequirePublishedYears
      title="مصروفات الوقف"
      icon={TrendingDown}
      description="ملخّص إفصاحي لمصروفات الوقف — للاطلاع فقط"
    >
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHeaderCard
            title="مصروفات الوقف"
            icon={TrendingDown}
            description="ملخّص إفصاحي لمصروفات الوقف — للاطلاع فقط"
            actions={<ExportMenu onExportPdf={h.handleExportPdf} onExportCsv={h.handleExportCsv} />}
          />

          <div
            className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"
            role="status"
          >
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>عرض إفصاحي مُلخَّص — يشمل الإجماليات وتوزيع النِسَب فقط. التفاصيل الصف-بصف محصورة بلوحة الناظر.</p>
          </div>

          <ExpenseSummaryCards
            expenses={h.expenses}
            totalExpenses={h.totalExpenses}
            documentedCount={0}
            documentationRate={0}
            isLoading={h.isLoading}
          />
          <ExpensesPieChart expenses={h.expenses} isLoading={h.isLoading} />
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default ExpensesViewPage;
