import { useState, lazy, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, LayoutGrid, Users, Palette, Bell, ShieldCheck, Shield, Globe, Download, Calendar, Megaphone, LayoutList, FlaskConical, Fingerprint, Banknote, FileText, Settings, MessageSquare } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';

// — مكونات inline مستخرجة —
import WaqfSettingsTab from '@/components/settings/WaqfSettingsTab';
import SectionsTab from '@/components/settings/SectionsTab';
import BeneficiaryTab from '@/components/settings/BeneficiaryTab';
import AppearanceTab from '@/components/settings/AppearanceTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import SecurityTab from '@/components/settings/SecurityTab';

// — مكونات محملة كسول —
const LandingPageTab = lazy(() => import('@/components/settings/LandingPageTab'));
const DataExportTab = lazy(() => import('@/components/settings/DataExportTab'));
const FiscalYearManagementTab = lazy(() => import('@/components/settings/FiscalYearManagementTab'));
const BulkNotificationsTab = lazy(() => import('@/components/settings/BulkNotificationsTab'));
const MenuCustomizationTab = lazy(() => import('@/components/settings/MenuCustomizationTab'));
const BannerSettingsTab = lazy(() => import('@/components/settings/BannerSettingsTab'));
const BulkMessagingTab = lazy(() => import('@/components/settings/BulkMessagingTab'));
const RolePermissionsTab = lazy(() => import('@/components/settings/RolePermissionsTab'));
const BiometricSettings = lazy(() => import('@/components/settings/BiometricSettings'));
const AdvanceSettingsTab = lazy(() => import('@/components/settings/AdvanceSettingsTab'));
const ZatcaSettingsTab = lazy(() => import('@/components/settings/ZatcaSettingsTab'));

const LOADING = <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

// === تصنيف التبويبات في فئات ===
const SETTINGS_CATEGORIES = [
  {
    label: 'الهوية والمظهر',
    tabs: [
      { value: 'waqf', label: 'بيانات الوقف', icon: Building2 },
      { value: 'landing', label: 'الواجهة الرئيسية', icon: Globe },
      { value: 'appearance', label: 'المظهر', icon: Palette },
      { value: 'banner', label: 'شريط التنبيه', icon: FlaskConical },
    ],
  },
  {
    label: 'المالية',
    tabs: [
      { value: 'fiscal', label: 'السنوات المالية', icon: Calendar },
      { value: 'advances', label: 'السُلف', icon: Banknote },
      { value: 'zatca', label: 'الضريبة (ZATCA)', icon: FileText },
    ],
  },
  {
    label: 'المستخدمون والأقسام',
    tabs: [
      { value: 'role-permissions', label: 'صلاحيات الأدوار', icon: Shield },
      { value: 'sections', label: 'الأقسام', icon: LayoutGrid },
      { value: 'menu', label: 'القائمة', icon: LayoutList },
      { value: 'beneficiary', label: 'واجهة المستفيد', icon: Users },
    ],
  },
  {
    label: 'النظام',
    tabs: [
      { value: 'notifications', label: 'الإشعارات', icon: Bell },
      { value: 'bulk-notify', label: 'إشعارات جماعية', icon: Megaphone },
      { value: 'bulk-message', label: 'رسائل جماعية', icon: MessageSquare },
      { value: 'export', label: 'تصدير البيانات', icon: Download },
      { value: 'biometric', label: 'البصمة', icon: Fingerprint },
      { value: 'security', label: 'الأمان', icon: ShieldCheck },
    ],
  },
];

const SettingsPage = () => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('waqf');
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard title="الإعدادات العامة" icon={Settings} description="إدارة جميع إعدادات النظام من مكان واحد" />
        <Tabs defaultValue="waqf" dir="rtl" onValueChange={setActiveSettingsTab} value={activeSettingsTab}>
          {/* Mobile: Select dropdown مصنّف */}
          <div className="md:hidden mb-4">
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
          {/* Desktop: TabsList مصنّف في فئات */}
          <div className="hidden md:flex flex-col gap-2 mb-4">
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
          <TabsContent value="waqf"><WaqfSettingsTab /></TabsContent>
          <TabsContent value="landing"><Suspense fallback={LOADING}><LandingPageTab /></Suspense></TabsContent>
          <TabsContent value="sections"><SectionsTab /></TabsContent>
          <TabsContent value="menu"><Suspense fallback={LOADING}><MenuCustomizationTab /></Suspense></TabsContent>
          <TabsContent value="beneficiary"><BeneficiaryTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="fiscal"><Suspense fallback={LOADING}><FiscalYearManagementTab /></Suspense></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="bulk-notify"><Suspense fallback={LOADING}><BulkNotificationsTab /></Suspense></TabsContent>
          <TabsContent value="bulk-message"><Suspense fallback={LOADING}><BulkMessagingTab /></Suspense></TabsContent>
          <TabsContent value="export"><Suspense fallback={LOADING}><DataExportTab /></Suspense></TabsContent>
          <TabsContent value="banner"><Suspense fallback={LOADING}><BannerSettingsTab /></Suspense></TabsContent>
          <TabsContent value="role-permissions"><Suspense fallback={LOADING}><RolePermissionsTab /></Suspense></TabsContent>
          <TabsContent value="biometric"><Suspense fallback={LOADING}><BiometricSettings /></Suspense></TabsContent>
          <TabsContent value="advances"><Suspense fallback={LOADING}><AdvanceSettingsTab /></Suspense></TabsContent>
          <TabsContent value="zatca"><Suspense fallback={LOADING}><ZatcaSettingsTab /></Suspense></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
