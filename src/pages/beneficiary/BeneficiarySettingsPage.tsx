/**
 * صفحة إعدادات المستفيد — مقسّمة إلى تبويبات فرعية
 */
import { ResponsiveTabs, TabsContent, type TabItem } from '@/components/ui/responsive-tabs';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { User, Lock, Bell, Shield, Palette, Landmark } from 'lucide-react';
import ThemeColorPicker from '@/components/theme/ThemeColorPicker';
import { BiometricSettings, AccountTab, BankAccountTab, PasswordTab, NotificationsTab } from '@/components/settings';
import { TableSkeleton, ErrorState } from '@/components/common';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import { useBeneficiarySettingsPage } from '@/hooks/page/beneficiary';

const tabItems: TabItem[] = [
  { value: 'account', label: 'الحساب', icon: <User className="w-4 h-4" /> },
  { value: 'bank', label: 'الحساب البنكي', icon: <Landmark className="w-4 h-4" /> },
  { value: 'password', label: 'كلمة المرور', icon: <Lock className="w-4 h-4" /> },
  { value: 'biometric', label: 'البصمة', icon: <Shield className="w-4 h-4" /> },
  { value: 'notifications', label: 'الإشعارات', icon: <Bell className="w-4 h-4" /> },
  { value: 'theme', label: 'المظهر', icon: <Palette className="w-4 h-4" /> },
];

const BeneficiarySettingsPage = () => {
  const {
    user,
    currentBeneficiary,
    maskedId,
    benLoading,
    benError,
    handleRetry,
  } = useBeneficiarySettingsPage();

  // ترتيب الحالات: التحميل أولاً، ثم الخطأ، ثم البيانات الفارغة
  if (benLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <TableSkeleton rows={4} cols={2} />
        </div>
      </DashboardLayout>
    );
  }

  if (benError) {
    return (
      <ErrorState
        message="حدث خطأ أثناء تحميل البيانات"
        onRetry={handleRetry}
      />
    );
  }

  if (!currentBeneficiary) {
    return <UnlinkedAccountNotice />;
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
          items={tabItems}
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
