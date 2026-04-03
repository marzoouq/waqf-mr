/**
 * صفحة إدارة ZATCA — Orchestrator
 */
import { useState } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, FileText, Link2 } from 'lucide-react';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';

import ZatcaSummaryCards from '@/components/zatca/ZatcaSummaryCards';
import ZatcaInvoicesTab from '@/components/zatca/ZatcaInvoicesTab';
import ZatcaCertificatesTab from '@/components/zatca/ZatcaCertificatesTab';
import ZatcaChainTab from '@/components/zatca/ZatcaChainTab';
import ZatcaComplianceDialog from '@/components/zatca/ZatcaComplianceDialog';
import { useZatcaManagement } from '@/hooks/page/useZatcaManagement';

interface ComplianceMessage {
  code: string;
  message: string;
}

interface ComplianceResult {
  warningMessages?: ComplianceMessage[];
  errorMessages?: ComplianceMessage[];
  infoMessages?: ComplianceMessage[];
  validationResults?: {
    status?: string;
    warningMessages?: ComplianceMessage[];
    errorMessages?: ComplianceMessage[];
    infoMessages?: ComplianceMessage[];
  };
}

function ZatcaManagementPage() {
  const z = useZatcaManagement();
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard title="إدارة ZATCA" icon={ShieldCheck} description="إدارة الشهادات والفواتير الضريبية وسلسلة التوقيع" />
        <InvoiceStepsGuide />

        {!z.activeCert && !z.certsLoading && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
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

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices"><FileText className="w-4 h-4 ml-1" />الفواتير</TabsTrigger>
            <TabsTrigger value="certificates"><ShieldCheck className="w-4 h-4 ml-1" />الشهادات</TabsTrigger>
            <TabsTrigger value="chain"><Link2 className="w-4 h-4 ml-1" />سلسلة التوقيع</TabsTrigger>
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
              onGenerateXml={(id, table) => z.generateXml.mutate({ invoiceId: id, table })}
              onSignInvoice={(id, table) => z.signInvoice.mutate({ invoiceId: id, table })}
              onSubmitToZatca={(id, table, action) => z.submitToZatca.mutate({ invoiceId: id, table, action })}
              onComplianceCheck={(id, table) => {
                z.complianceCheck.mutate({ invoiceId: id, table }, {
                  onSuccess: (data) => setComplianceResult(data),
                });
              }}
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
              onOnboard={z.handleOnboard}
              onProductionUpgrade={z.handleProductionUpgrade}
            />
          </TabsContent>

          <TabsContent value="chain" className="space-y-4">
            <ZatcaChainTab chain={z.chain} chainLoading={z.chainLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <ZatcaComplianceDialog result={complianceResult} onClose={() => setComplianceResult(null)} />
    </DashboardLayout>
  );
}

export default ZatcaManagementPage;
