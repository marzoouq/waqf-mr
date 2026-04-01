/**
 * ملف توافق رجعي — إعادة تصدير من الوحدات الفرعية في renderers/
 * يحافظ على التوافق مع كل الاستيرادات الحالية
 */
export {
  renderSellerInfo, renderBuyerInfo,
  renderInvoiceMeta,
  renderLineItemsTable, renderAllowanceChargeTable,
  renderVatSummary, renderBankDetails,
} from './renderers/index';
