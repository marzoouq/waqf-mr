/**
 * صفحة الدعم الفني للمستفيد — تقديم ومتابعة تذاكر الدعم + تقييم الخدمة
 */
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headset, Loader2, MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeaderCard from '@/components/layout/PageHeaderCard';
import { useSupportTickets, type SupportTicket } from '@/hooks/data/useSupportTickets';
import TicketList from '@/components/support/TicketList';
import TicketViewDialog from '@/components/support/TicketViewDialog';
import NewTicketDialog from '@/components/support/NewTicketDialog';

const BeneficiarySupportPage = () => {
  const { data, isLoading } = useSupportTickets();
  const tickets = data?.tickets ?? [];
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="الدعم الفني"
          description="تقديم ومتابعة طلبات الدعم"
          icon={Headset}
          actions={
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Plus className="w-4 h-4 ml-2" />
              طلب دعم جديد
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              تذاكري
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
