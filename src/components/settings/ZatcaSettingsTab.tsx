/**
 * تبويب إعدادات ZATCA — الفاتورة الإلكترونية
 */
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, History } from 'lucide-react';
import { useZatcaSettings } from '@/hooks/page/admin/settings/useZatcaSettings';
import ZatcaOperationsLog from './ZatcaOperationsLog';
import ZatcaCertExpiryWarning from './zatca/ZatcaCertExpiryWarning';
import ZatcaPhasePlatform from './zatca/ZatcaPhasePlatform';
import ZatcaConnectionStatus from './zatca/ZatcaConnectionStatus';
import ZatcaFormCards from './zatca/ZatcaFormCards';
import ZatcaActions from './zatca/ZatcaActions';

const ZatcaSettingsTab = () => {
  const {
    isLoading, formData, setFormData, saving, onboardLoading, renewLoading,
    connectionTest, activeCert, isEnabled, selectedPhase, selectedPlatform,
    certExpiryWarning,
    handleSave, handleSetupAndOnboard, handleRenewCertificate, handleTestConnection,
  } = useZatcaSettings();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* تحذير انتهاء صلاحية الشهادة */}
      {certExpiryWarning && (
        <ZatcaCertExpiryWarning
          warning={certExpiryWarning}
          isProductionCert={activeCert?.certificate_type === 'production'}
          onRenew={handleRenewCertificate}
          renewLoading={renewLoading}
        />
      )}

      {/* تفعيل الفاتورة الإلكترونية */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">تفعيل الفاتورة الإلكترونية السعودية</p>
                <p className="text-sm text-muted-foreground">هيئة الزكاة والضريبة والجمارك (ZATCA)</p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => setFormData(p => ({ ...p, zatca_enabled: String(checked) }))}
            />
          </div>
        </CardContent>
      </Card>

      {isEnabled && (
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="settings" className="flex-1 gap-2">
              <ShieldCheck className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="log" className="flex-1 gap-2">
              <History className="w-4 h-4" />
              سجل العمليات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4">
            <ZatcaOperationsLog />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            <ZatcaPhasePlatform
              selectedPhase={selectedPhase}
              selectedPlatform={selectedPlatform}
              setFormData={setFormData}
            />

            <ZatcaConnectionStatus
              selectedPlatform={selectedPlatform}
              connectionTest={connectionTest}
              onTestConnection={handleTestConnection}
            />

            <ZatcaFormCards formData={formData} setFormData={setFormData} />

            <Separator />

            <ZatcaActions
              saving={saving}
              onboardLoading={onboardLoading}
              renewLoading={renewLoading}
              activeCert={activeCert ?? null}
              handleSave={handleSave}
              handleSetupAndOnboard={handleSetupAndOnboard}
              handleRenewCertificate={handleRenewCertificate}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ZatcaSettingsTab;
