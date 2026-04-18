/**
 * Barrel — utils/pdf/shared/renderers
 * يُستهلك من `paymentInvoiceShared.ts` عبر `../shared/renderers/index`.
 */
export { renderInvoiceMeta } from './invoiceMeta';
export { renderSellerInfo, renderBuyerInfo } from './sellerBuyer';
export { renderVatSummary, renderBankDetails } from './summary';
export { renderLineItemsTable, renderAllowanceChargeTable } from './tables';
