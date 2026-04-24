/**
 * useZatcaManagement — Facade يجمع 4 hooks فرعية ويحافظ على نفس API السطحي
 * - useZatcaSettings: إعدادات ZATCA + missingSettings + canOnboard
 * - useZatcaInvoices: فواتير + سلسلة + pagination + counters
 * - useZatcaInvoiceActions: 5 mutations + pendingIds
 * - useZatcaOnboarding: handleOnboard + handleProductionUpgrade
 */
import { useZatcaCertificates } from './useZatcaCertificates';
import { useZatcaSettings } from './useZatcaSettings';
import { useZatcaInvoices } from './useZatcaInvoices';
import { useZatcaInvoiceActions } from './useZatcaInvoiceActions';
import { useZatcaOnboarding } from './useZatcaOnboarding';

export function useZatcaManagement() {
  const { data: certificates = [], isLoading: certsLoading } = useZatcaCertificates();
  const { missingSettings, canOnboard } = useZatcaSettings();
  const invoices = useZatcaInvoices();
  const actions = useZatcaInvoiceActions();
  const onboarding = useZatcaOnboarding();

  const activeCert = certificates.find(c => c.is_active);
  const isComplianceCert = activeCert?.certificate_type === 'compliance';
  const isProductionCert = activeCert?.certificate_type === 'production';

  return {
    // certificates
    certificates, certsLoading, activeCert, isComplianceCert, isProductionCert,
    // settings
    canOnboard, missingSettings,
    // invoices
    allInvoices: invoices.allInvoices,
    paginatedInvoices: invoices.paginatedInvoices,
    invoicesLoading: invoices.invoicesLoading,
    chain: invoices.chain,
    chainLoading: invoices.chainLoading,
    submitted: invoices.submitted,
    pending: invoices.pending,
    rejected: invoices.rejected,
    statusFilter: invoices.statusFilter,
    setStatusFilter: invoices.setStatusFilter,
    invoicePage: invoices.invoicePage,
    setInvoicePage: invoices.setInvoicePage,
    INVOICES_PER_PAGE: invoices.INVOICES_PER_PAGE,
    // actions
    pendingIds: actions.pendingIds,
    generateXml: actions.generateXml,
    signInvoice: actions.signInvoice,
    submitToZatca: actions.submitToZatca,
    complianceCheck: actions.complianceCheck,
    // onboarding
    onboardLoading: onboarding.onboardLoading,
    productionLoading: onboarding.productionLoading,
    handleOnboard: onboarding.handleOnboard,
    handleProductionUpgrade: onboarding.handleProductionUpgrade,
  };
}
