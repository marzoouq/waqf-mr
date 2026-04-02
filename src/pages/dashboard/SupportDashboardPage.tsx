/**
 * صفحة لوحة تحكم الدعم الفني — Orchestrator
 */
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Headset, Bug, BarChart3 } from 'lucide-react';
import PageHeaderCard from '@/components/layout/PageHeaderCard';

import SupportStatsCards from '@/components/support/SupportStatsCards';
import SupportTicketsTab from '@/components/support/SupportTicketsTab';
import SupportErrorsTab from '@/components/support/SupportErrorsTab';
import SupportAnalyticsTab from '@/components/support/SupportAnalyticsTab';
import TicketDetailDialog from '@/components/support/TicketDetailDialog';
import NewTicketDialog from '@/components/support/NewTicketDialog';
import { useSupportDashboardPage } from '@/hooks/page/useSupportDashboardPage';

const SupportDashboardPage = () => {
  const {
    role, isLoading, stats,
    statusFilter, setStatusFilter, categoryFilter, setCategoryFilter,
    searchQuery, setSearchQuery, errorSearch, setErrorSearch,
    filteredTickets, filteredErrors,
    selectedTicket, setSelectedTicket,
    showNewTicket, setShowNewTicket,
    handleExportTickets, handleExportErrors,
    categoryStats, priorityStats, avgResolutionTime, avgRating,
  } = useSupportDashboardPage();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="مركز الدعم الفني"
          icon={Headset}
          description="إدارة التذاكر والأخطاء ومراقبة الأداء"
          actions={role === 'admin' ? (
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Headset className="w-4 h-4 ml-2" />
              تذكرة جديدة
            </Button>
          ) : undefined}
        />

        <SupportStatsCards
          openTickets={stats?.openTickets ?? 0}
          inProgressTickets={stats?.inProgressTickets ?? 0}
          errorsLast24h={stats?.errorsLast24h ?? 0}
          resolvedTickets={stats?.resolvedTickets ?? 0}
          avgResolutionTime={avgResolutionTime}
          avgRating={avgRating}
        />

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tickets" className="gap-1"><Headset className="w-4 h-4" />التذاكر</TabsTrigger>
            <TabsTrigger value="errors" className="gap-1"><Bug className="w-4 h-4" />الأخطاء</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1"><BarChart3 className="w-4 h-4" />الإحصائيات</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <SupportTicketsTab
              filteredTickets={filteredTickets}
              isLoading={isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onExport={handleExportTickets}
              onSelectTicket={setSelectedTicket}
            />
          </TabsContent>

          <TabsContent value="errors">
            <SupportErrorsTab
              filteredErrors={filteredErrors}
              errorSearch={errorSearch}
              setErrorSearch={setErrorSearch}
              onExport={handleExportErrors}
            />
          </TabsContent>

          <TabsContent value="stats">
            <SupportAnalyticsTab
              stats={stats}
              avgResolutionTime={avgResolutionTime}
              avgRating={avgRating}
              categoryStats={categoryStats}
              priorityStats={priorityStats}
            />
          </TabsContent>
        </Tabs>
      </div>

      {selectedTicket && (
        <TicketDetailDialog ticket={selectedTicket} onClose={() => setSelectedTicket(null)} isAdmin={role === 'admin'} />
      )}

      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

export default SupportDashboardPage;
