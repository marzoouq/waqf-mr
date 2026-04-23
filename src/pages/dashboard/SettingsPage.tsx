import { lazy, Suspense } from 'react';
import { useSettingsPage } from '@/hooks/page/admin/management/useSettingsPage';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import PageLoader from '@/components/common/PageLoader';
import { SETTINGS_CATEGORIES } from '@/constants/settingsCategories';

// — مكونات محمّلة كسول (كانت inline سابقاً) —
const WaqfSettingsTab = lazy(() => import('@/components/settings/WaqfSettingsTab'));
const AppearanceTab = lazy(() => import('@/components/settings/AppearanceTab'));
const NotificationsTab = lazy(() => import('@/components/settings/NotificationsTab'));
const SecurityTab = lazy(() => import('@/components/settings/SecurityTab'));

// — مكونات محملة كسول —
const LandingPageTab = lazy(() => import('@/components/settings/LandingPageTab'));
const DataExportTab = lazy(() => import('@/components/settings/DataExportTab'));
const FiscalYearManagementTab = lazy(() => import('@/components/settings/FiscalYearManagementTab'));
const BulkNotificationsTab = lazy(() => import('@/components/settings/BulkNotificationsTab'));
const MenuCustomizationTab = lazy(() => import('@/components/settings/MenuCustomizationTab'));
const BannerSettingsTab = lazy(() => import('@/components/settings/BannerSettingsTab'));
const BulkMessagingTab = lazy(() => import('@/components/settings/BulkMessagingTab'));
const PermissionsControlPanel = lazy(() => import('@/components/settings/PermissionsControlPanel'));
const BiometricSettings = lazy(() => import('@/components/settings/BiometricSettings'));
const AdvanceSettingsTab = lazy(() => import('@/components/settings/AdvanceSettingsTab'));
const ZatcaSettingsTab = lazy(() => import('@/components/settings/ZatcaSettingsTab'));
const SystemSettingsTab = lazy(() => import('@/components/settings/SystemSettingsTab'));

const LOADING = <PageLoader />;

const SettingsPage = () => {
  const { activeTab: activeSettingsTab, setActiveTab: setActiveSettingsTab, isMobile } = useSettingsPage('waqf');
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard title="الإعدادات العامة" icon={Settings} description="إدارة جميع إعدادات النظام من مكان واحد" />
        <Tabs dir="rtl" onValueChange={setActiveSettingsTab} value={activeSettingsTab}>
          {isMobile ? (
            <div className="mb-4">
              <Select value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
                <SelectTrigger className="w-full"><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                <SelectContent>
                  {SETTINGS_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground border-b border-border">{cat.label}</div>
                      {cat.tabs.map((tab) => (<SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {SETTINGS_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-xs font-bold text-muted-foreground mb-1.5 px-1">{cat.label}</p>
                  <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
                    {cat.tabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs md:text-sm">
                        <tab.icon className="w-4 h-4" />{tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              ))}
            </div>
          )}
          <TabsContent value="waqf"><Suspense fallback={LOADING}><WaqfSettingsTab /></Suspense></TabsContent>
          <TabsContent value="landing"><Suspense fallback={LOADING}><LandingPageTab /></Suspense></TabsContent>
          <TabsContent value="permissions"><Suspense fallback={LOADING}><PermissionsControlPanel /></Suspense></TabsContent>
          <TabsContent value="appearance"><Suspense fallback={LOADING}><AppearanceTab /></Suspense></TabsContent>
          <TabsContent value="fiscal"><Suspense fallback={LOADING}><FiscalYearManagementTab /></Suspense></TabsContent>
          <TabsContent value="notifications"><Suspense fallback={LOADING}><NotificationsTab /></Suspense></TabsContent>
          <TabsContent value="bulk-notify"><Suspense fallback={LOADING}><BulkNotificationsTab /></Suspense></TabsContent>
          <TabsContent value="bulk-message"><Suspense fallback={LOADING}><BulkMessagingTab /></Suspense></TabsContent>
          <TabsContent value="export"><Suspense fallback={LOADING}><DataExportTab /></Suspense></TabsContent>
          <TabsContent value="banner"><Suspense fallback={LOADING}><BannerSettingsTab /></Suspense></TabsContent>
          <TabsContent value="menu"><Suspense fallback={LOADING}><MenuCustomizationTab /></Suspense></TabsContent>
          <TabsContent value="biometric"><Suspense fallback={LOADING}><BiometricSettings /></Suspense></TabsContent>
          <TabsContent value="advances"><Suspense fallback={LOADING}><AdvanceSettingsTab /></Suspense></TabsContent>
          <TabsContent value="zatca"><Suspense fallback={LOADING}><ZatcaSettingsTab /></Suspense></TabsContent>
          <TabsContent value="security"><Suspense fallback={LOADING}><SecurityTab /></Suspense></TabsContent>
          <TabsContent value="system"><Suspense fallback={LOADING}><SystemSettingsTab /></Suspense></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
