/**
 * AdminDashboard — مركز قيادة الناظر بخمس طبقات (UI خالصة؛ المنطق في useAdminDashboardPage)
 * 1) السياق: العنوان والسنة المالية  2) يحتاج انتباهك  3) المركز المالي
 * 4) المحفظة والسنة والتحصيل  5) الإجراءات السريعة وتفاصيل التشغيل
 */
import { ChartSkeleton, ErrorBoundary } from '@/components/common';
import { lazy } from 'react';

import DashboardLazySection from '@/components/dashboard/DashboardLazySection';
import { Button } from '@/components/ui/button';
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import AdminCommandHeader from '@/components/dashboard/command/AdminCommandHeader';
import DashboardAlerts from '@/components/dashboard/widgets/DashboardAlerts';
import QuickActionsCard from '@/components/dashboard/widgets/QuickActionsCard';
import RecentContractsCard from '@/components/dashboard/widgets/RecentContractsCard';
import CollectionSummaryCard from '@/components/dashboard/kpi/CollectionSummaryCard';
import YearComparisonCard from '@/components/dashboard/kpi/YearComparisonCard';
import ExecutiveFinancialCards from '@/components/dashboard/executive/ExecutiveFinancialCards';
import PortfolioCard from '@/components/dashboard/executive/PortfolioCard';
import AccountantDashboardView from '@/components/dashboard/views/AccountantDashboardView';
import SectionHeading from '@/components/layout/SectionHeading';
import { Printer, FileDown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import type { FiscalYear } from '@/types';

import { useAdminDashboardPage } from '@/hooks/page/admin/dashboard/useAdminDashboardPage';
import { useAggregatedAnnualReport } from '@/hooks/page/admin/dashboard/useAggregatedAnnualReport';

// Lazy-load heavy below-the-fold components
const DashboardCharts = lazy(() => import('@/components/dashboard/charts/DashboardCharts'));
const CollectionHeatmap = lazy(() => import('@/components/dashboard/charts/CollectionHeatmap'));
const PendingActionsTable = lazy(() => import('@/components/dashboard/widgets/PendingActionsTable'));
const PagePerformanceCard = lazy(() => import('@/components/dashboard/views/PagePerformanceCard'));
const CriticalAlertsBanner = lazy(() => import('@/components/diagnostics/CriticalAlertsBanner'));

const AdminDashboard = () => {
  const ctx = useAdminDashboardPage();
  const aggregated = useAggregatedAnnualReport();

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {ctx.role === 'admin' && (
          <DashboardLazySection minHeight={0}>
            <CriticalAlertsBanner />
          </DashboardLazySection>
        )}

        {ctx.isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            حدث خطأ أثناء تحميل بيانات اللوحة. يُرجى المحاولة مرة أخرى.
          </div>
        )}

        {/* الطبقة 1 — رأس مركز القيادة: التحية والتاريخ والسنة المالية والإجراءات */}
        <AdminCommandHeader
          greetingData={ctx.greetingData}
          subtitle={ctx.greetingText}
          fiscalYear={ctx.fiscalYear}
          totalIncome={ctx.totalIncome}
          contractualRevenue={ctx.contractualRevenue}
          actions={
            <>
              {ctx.role === 'admin' && (
                <Button variant="secondary" size="sm" onClick={aggregated.handleExport} disabled={!aggregated.canExport} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  تقرير سنوي مُجمَّع
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={ctx.print} className="gap-2 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
            </>
          }
        />

        {/* الطبقة 2 — يحتاج انتباهك */}
        <DashboardAlerts
          usingFallbackPct={ctx.usingFallbackPct}
          expiringContractsCount={ctx.expiringContractsCount}
          orphanedContractsCount={ctx.orphanedContractsCount}
          pendingAdvancesCount={ctx.pendingAdvancesCount}
          collectionRate={ctx.collectionSummary.percentage}
          expenseRatio={ctx.expenseRatio}
          canApproveAdvances={ctx.role === 'admin'}
          canConfigureRatios={ctx.role === 'admin'}
        />

        {/* الطبقة 3 — المركز المالي (أرقام الخادم كما هي) */}
        <ExecutiveFinancialCards
          cards={ctx.executiveCards}
          isLoading={ctx.isLoading}
          isClosedYear={ctx.isClosedYear}
          expenseKpi={ctx.expenseKpi}
        />

        {/* الطبقة 4 — المحفظة والتحصيل جنباً إلى جنب */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5"><PortfolioCard portfolio={ctx.portfolio} /></div>
          <div className="lg:col-span-7">
            <ErrorBoundary>
              <CollectionSummaryCard collectionSummary={ctx.collectionSummary} collectionColor={ctx.collectionColor} />
            </ErrorBoundary>
          </div>
        </div>

        {/* الطبقة 5 — الإجراءات وتفاصيل التشغيل */}
        <QuickActionsCard role={ctx.role} />

        {ctx.isAccountant && (
          <DashboardLazySection minHeight={200}>
            <AccountantDashboardView
              metrics={ctx.accountantMetrics}
              aggregated={ctx.accountantAggregated}
              isLoading={ctx.isLoading || ctx.secondaryIsLoading}
            />
          </DashboardLazySection>
        )}

        <section aria-label="تفاصيل التشغيل">
          <SectionHeading title="تفاصيل التشغيل" />
          <ResponsiveTabs items={[...ctx.detailTabs]} defaultValue="heatmap" ariaLabel="اختر تفاصيل التشغيل">
            <TabsContent value="heatmap">
              <DashboardLazySection minHeight={160} printHidden>
                <CollectionHeatmap
                  paymentInvoices={ctx.heatmapInvoices}
                  fiscalYearStart={ctx.heatmapBounds.start}
                  fiscalYearEnd={ctx.heatmapBounds.end}
                />
              </DashboardLazySection>
            </TabsContent>

            {/* PendingActions / Charts / YearComparison — حصرية للناظر (تكشف بيانات حساسة) */}
            {ctx.role === 'admin' && (
              <>
                <TabsContent value="pending">
                  <DashboardLazySection minHeight={200} printHidden>
                    <PendingActionsTable
                      advanceRequests={ctx.pendingAdvances}
                      paymentInvoices={ctx.heatmapInvoices}
                    />
                  </DashboardLazySection>
                </TabsContent>
                <TabsContent value="charts">
                  <DashboardLazySection minHeight={300} printHidden fallback={<ChartSkeleton />}>
                    <DashboardCharts monthlyData={ctx.monthlyData} expenseTypes={ctx.expenseTypes} />
                  </DashboardLazySection>
                </TabsContent>
                <TabsContent value="comparison">
                  <DashboardLazySection minHeight={200}>
                    <YearComparisonCard
                      allFiscalYears={ctx.allFiscalYears as FiscalYear[]}
                      fiscalYearId={ctx.fiscalYearId}
                    />
                  </DashboardLazySection>
                </TabsContent>
              </>
            )}

            <TabsContent value="contracts">
              <DashboardLazySection minHeight={200}>
                <RecentContractsCard
                  contracts={ctx.recentContracts}
                  isLoading={ctx.secondaryIsLoading}
                  isError={ctx.isRecentContractsError}
                />
              </DashboardLazySection>
            </TabsContent>
          </ResponsiveTabs>
        </section>

        {ctx.showPerformanceCard && (
          <DashboardLazySection minHeight={200} printHidden>
            <PagePerformanceCard />
          </DashboardLazySection>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
