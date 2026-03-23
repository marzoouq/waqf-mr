/**
 * معاينة فاتورة ضريبية — متوافقة مع ZATCA Phase 2
 * يدعم التبديل بين القالب الاحترافي والمبسط
 * تحميل PDF يأخذ لقطة من المعاينة مباشرة (WYSIWYG)
 */
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { ProfessionalTemplate, SimplifiedTemplate, TemplateSelector, type InvoiceTemplateData } from './InvoiceTemplates';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export type InvoicePreviewData = InvoiceTemplateData;

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoicePreviewData | null;
}

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open, onOpenChange, invoice,
}) => {
  const [template, setTemplate] = useState<'professional' | 'simplified'>(
    invoice?.type === 'standard' ? 'professional' : 'simplified'
  );
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (invoice) {
      setTemplate(invoice.type === 'standard' ? 'professional' : 'simplified');
    }
  }, [invoice]);

  /** تحميل PDF عبر لقطة من المعاينة — تطابق 100% */
  const handleDownloadPdf = useCallback(async () => {
    const element = document.getElementById('invoice-preview-content');
    if (!element || !invoice) return;

    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // إذا كان المحتوى أطول من صفحة واحدة، نضيف صفحات إضافية
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let remainingHeight = pdfHeight;
        let position = 0;
        while (remainingHeight > 0) {
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          remainingHeight -= pageHeight;
          position -= pageHeight;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      const safeName = (invoice.invoiceNumber || 'invoice').replace(/[./\\]+/g, '_');
      pdf.save(`فاتورة-${safeName}.pdf`);
      toast.success('تم تحميل الفاتورة بنجاح');
    } catch (err) {
      logger.error('[InvoicePreviewDialog] PDF download error:', err);
      toast.error('حدث خطأ أثناء تحميل الفاتورة');
    } finally {
      setDownloading(false);
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{downloading ? 'جاري التحميل...' : 'تحميل PDF'}</span>
            </Button>
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
