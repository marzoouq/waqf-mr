/**
 * SupportMaintenancePage — إدارة وضع الصيانة لدور الدعم الفني
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Wrench } from 'lucide-react';
import MaintenanceModePanel from '@/components/diagnostics/MaintenanceModePanel';

export default function SupportMaintenancePage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="وضع الصيانة"
          icon={Wrench}
          description="تفعيل أو إيقاف الوصول للمستخدمين مع رسالة مخصصة"
        />
        <MaintenanceModePanel />
      </div>
    </DashboardLayout>
  );
}
