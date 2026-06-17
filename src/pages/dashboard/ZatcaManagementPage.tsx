/**
 * صفحة إدارة ZATCA — Orchestrator
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, FileText, Link2 } from 'lucide-react';
import { InvoiceStepsGuide } from '@/components/invoices';

import ZatcaSummaryCards from '@/components/zatca/ZatcaSummaryCards';
import ZatcaHealthPanel from '@/components/zatca/ZatcaHealthPanel';
import ZatcaInvoicesTab from '@/components/zatca/ZatcaInvoicesTab';
import ZatcaCertificatesTab from '@/components/zatca/ZatcaCertificatesTab';
import ZatcaChainTab from '@/components/zatca/ZatcaChainTab';
import ZatcaComplianceDialog from '@/components/zatca/ZatcaComplianceDialog';
import ZatcaCertExpiryWarning from '@/components/settings/zatca/ZatcaCertExpiryWarning';
import { useZatcaCertExpiry } from '@/hooks/page/admin/management/zatca/useZatcaCertExpiry';
import { useZatcaManagementPage } from '@/hooks/page/admin/management/useZatcaManagementPage';

function ZatcaManagementPage() {
  const {
    z,
    complianceResult,
    runComplianceCheck,
    clearComplianceResult,
    generateXml,
    signInvoice,
    submitToZatca,
    handleOnboard,
    handleProductionUpgrade,
  } = useZatcaManagementPage();
  const { certExpiryWarning } = useZatcaCertExpiry();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard title="تكامل ZATCA" icon={ShieldCheck} description="إدارة الشهادات والفواتير الضريبية وسلسلة التوقيع" />
        <InvoiceStepsGuide />

        {certExpiryWarning && (
          <ZatcaCertExpiryWarning
            warning={certExpiryWarning}
            isProductionCert={z.isProductionCert}
            onRenew={handleProductionUpgrade}
            renewLoading={z.productionLoading}
          />
        )}



        {!z.activeCert && !z.certsLoading && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm" role="alert">
            <p className="font-medium">⚠️ لا توجد شهادة ZATCA نشطة</p>
            <p className="text-muted-foreground mt-1">يرجى التسجيل للحصول على شهادة امتثال من تبويب "الشهادات" أولاً.</p>
          </div>
        )}

        <ZatcaSummaryCards
          submitted={z.submitted}
          pending={z.pending}
          rejected={z.rejected}
          activeCertType={z.activeCert ? (z.isProductionCert ? 'production' : 'compliance') : null}
        />

        <ZatcaHealthPanel
          activeCert={z.activeCert}
          chain={z.chain}
          pendingInvoices={z.pending}
        />

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList aria-label="أقسام إدارة ZATCA" className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices"><FileText className="w-4 h-4 me-1" />الفواتير</TabsTrigger>
            <TabsTrigger value="certificates"><ShieldCheck className="w-4 h-4 me-1" />الشهادات</TabsTrigger>
            <TabsTrigger value="chain"><Link2 className="w-4 h-4 me-1" />سلسلة التوقيع</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <ZatcaInvoicesTab
              allInvoices={z.allInvoices}
              paginatedInvoices={z.paginatedInvoices}
              invoicesLoading={z.invoicesLoading}
              statusFilter={z.statusFilter}
              setStatusFilter={z.setStatusFilter}
              invoicePage={z.invoicePage}
              setInvoicePage={z.setInvoicePage}
              itemsPerPage={z.INVOICES_PER_PAGE}
              isComplianceCert={z.isComplianceCert}
              isProductionCert={z.isProductionCert}
              pendingIds={z.pendingIds}
              onGenerateXml={generateXml}
              onSignInvoice={signInvoice}
              onSubmitToZatca={submitToZatca}
              onComplianceCheck={runComplianceCheck}
            />
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <ZatcaCertificatesTab
              certificates={z.certificates}
              certsLoading={z.certsLoading}
              isComplianceCert={z.isComplianceCert}
              isProductionCert={z.isProductionCert}
              activeCert={z.activeCert}
              canOnboard={z.canOnboard}
              missingSettings={z.missingSettings}
              onboardLoading={z.onboardLoading}
              productionLoading={z.productionLoading}
              onOnboard={handleOnboard}
              onProductionUpgrade={handleProductionUpgrade}
            />
          </TabsContent>

          <TabsContent value="chain" className="space-y-4">
            <ZatcaChainTab chain={z.chain} chainLoading={z.chainLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <ZatcaComplianceDialog result={complianceResult} onClose={clearComplianceResult} />
    </DashboardLayout>
  );
}

export default ZatcaManagementPage;
