/**
 * معاينة فاتورة ضريبية — متوافقة مع ZATCA Phase 2
 * يدعم التبديل بين القالب الاحترافي والمبسط
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { ProfessionalTemplate, SimplifiedTemplate, TemplateSelector, type InvoiceTemplateData } from './InvoiceTemplates';

export type InvoicePreviewData = InvoiceTemplateData;

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoicePreviewData | null;
  onDownloadPdf?: (template: 'professional' | 'simplified') => void;
}

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open, onOpenChange, invoice, onDownloadPdf,
}) => {
  // ربط القالب الافتراضي بنوع الفاتورة تلقائياً
  const [template, setTemplate] = useState<'professional' | 'simplified'>(
    invoice?.type === 'standard' ? 'professional' : 'simplified'
  );

  // تحديث القالب عند تغير الفاتورة المعروضة
  useEffect(() => {
    if (invoice) {
      setTemplate(invoice.type === 'standard' ? 'professional' : 'simplified');
    }
  }, [invoice]);

  if (!invoice) return null;

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base">معاينة الفاتورة الضريبية</DialogTitle>
            <DialogDescription className="sr-only">معاينة الفاتورة الضريبية المتوافقة مع ZATCA</DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDownloadPdf && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDownloadPdf(template)}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تحميل PDF</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pt-4">
          <TemplateSelector value={template} onChange={setTemplate} />
        </div>

        <div className="p-6 sm:p-8 print:p-0 overflow-x-auto" id="invoice-preview-content">
          {template === 'professional' ? (
            <ProfessionalTemplate data={invoice} />
          ) : (
            <SimplifiedTemplate data={invoice} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewDialog;
