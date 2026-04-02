/**
 * صفحة إعدادات المستفيد — مقسّمة إلى تبويبات فرعية
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useBeneficiariesSafe } from '@/hooks/data/useBeneficiaries';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Lock, Bell, Shield, Palette, AlertCircle, RefreshCw } from 'lucide-react';
import ThemeColorPicker from '@/components/theme/ThemeColorPicker';
import BiometricSettings from '@/components/settings/BiometricSettings';
import { TableSkeleton } from '@/components/common/SkeletonLoaders';
import PageHeaderCard from '@/components/layout/PageHeaderCard';
import AccountTab from '@/components/settings/AccountTab';
import PasswordTab from '@/components/settings/PasswordTab';
import NotificationsTab from '@/components/settings/NotificationsTab';

const BeneficiarySettingsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] }), [queryClient]);
  const { user } = useAuth();
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const maskedId = currentBeneficiary?.national_id ? '********' : '—';

  if (benError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (benLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <TableSkeleton rows={4} cols={2} />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBeneficiary) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">حسابك غير مرتبط</h2>
          <p className="text-muted-foreground text-center max-w-md">
            حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الإعدادات"
          description="إدارة حسابك وتفضيلاتك"
          icon={User}
        />

        <ResponsiveTabs
          defaultValue="account"
          className="space-y-4"
          items={[
            { value: 'account', label: 'الحساب', icon: <User className="w-4 h-4" /> },
            { value: 'password', label: 'كلمة المرور', icon: <Lock className="w-4 h-4" /> },
            { value: 'biometric', label: 'البصمة', icon: <Shield className="w-4 h-4" /> },
            { value: 'notifications', label: 'الإشعارات', icon: <Bell className="w-4 h-4" /> },
            { value: 'theme', label: 'المظهر', icon: <Palette className="w-4 h-4" /> },
          ] satisfies TabItem[]}
        >
          <TabsContent value="account">
            <AccountTab
              name={currentBeneficiary?.name || '—'}
              email={user?.email || '—'}
              maskedId={maskedId}
            />
          </TabsContent>

          <TabsContent value="password">
            <PasswordTab />
          </TabsContent>

          <TabsContent value="biometric">
            <BiometricSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeColorPicker />
          </TabsContent>
        </ResponsiveTabs>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiarySettingsPage;
