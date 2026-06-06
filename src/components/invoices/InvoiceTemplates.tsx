/**
 * ملف مجمّع — إعادة تصدير من المكونات الفرعية
 * يحافظ على التوافق مع كل الاستيرادات الحالية
 */
export type { InvoiceTemplateData, AllowanceChargeItem } from '@/utils/invoices/invoiceTemplate';
export { ProfessionalTemplate } from './templates/ProfessionalTemplate';
export { SimplifiedTemplate } from './templates/SimplifiedTemplate';
export { TemplateSelector } from './templates/TemplateSelector';
