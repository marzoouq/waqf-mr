/**
 * صفحة الدعم الفني للمستفيد — تقديم ومتابعة تذاكر الدعم
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headset, Loader2, MessageSquare, Plus, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { TicketList, TicketViewDialog, NewTicketDialog } from '@/components/support';
import { useSupportPage } from '@/hooks/page/beneficiary';
import { MESSAGES_VS_SUPPORT_COPY } from '@/constants/beneficiaryCopy';

const BeneficiarySupportPage = () => {
  const {
    tickets,
    isLoading,
    isError,
    refetch,
    selectedTicket,
    setSelectedTicket,
    showNewTicket,
    setShowNewTicket,
  } = useSupportPage();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        {/* CR-06: الدعم الفني صفحة مستقلة */}
        <PageHeaderCard
          title={MESSAGES_VS_SUPPORT_COPY.support.title}
          description={MESSAGES_VS_SUPPORT_COPY.support.description}
          icon={Headset}
          actions={
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Plus className="w-4 h-4 ml-2" />
              طلب دعم جديد
            </Button>
          }
        />

        {/* تعريف التذكرة */}
        <Card className="shadow-sm border-info/30 bg-info/5">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{MESSAGES_VS_SUPPORT_COPY.support.ticketDef}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {MESSAGES_VS_SUPPORT_COPY.support.listTitle}
              <span className="text-sm font-normal text-muted-foreground">({tickets.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <Headset className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">لا توجد تذاكر — يمكنك إنشاء طلب دعم جديد</p>
              </div>
            ) : (
              <TicketList tickets={tickets} onSelect={setSelectedTicket} />
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTicket && (
        <TicketViewDialog ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

export default BeneficiarySupportPage;

