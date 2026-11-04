import { Button } from '@/components/ui/button';
import { Loader2, Receipt } from 'lucide-react';
import { useReceiptVoucherDownload } from '@/hooks/page/admin/financial/useReceiptVoucherDownload';
import type { PaymentInvoice } from '@/types';

/** زر تنزيل سند القبض — يظهر للفواتير المسددة فقط */
export function ReceiptVoucherButton({ inv }: { inv: PaymentInvoice }) {
  const { download, loadingId } = useReceiptVoucherDownload();
  if (inv.status !== 'paid') return null;
  const busy = loadingId === inv.id;
  return (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={() => download(inv)} disabled={busy} title="تنزيل سند القبض" aria-label="تنزيل سند القبض">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
    </Button>
  );
}
