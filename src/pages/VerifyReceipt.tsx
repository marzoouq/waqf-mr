import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVerifyReceiptPage } from '@/hooks/page/public/useVerifyReceiptPage';
import { fmt } from '@/utils/format/format';
import { formatHijriGregorian } from '@/utils/format/hijriDate';

const VerifyReceipt = () => {
  const { valid, receipt, isLoading } = useVerifyReceiptPage();
  const found = valid && receipt;
  const dates = receipt ? formatHijriGregorian(receipt.paid_date) : null;

  return (
    <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-amiri text-2xl">التحقق من سند القبض</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          ) : found ? (
            <>
              {receipt.status === 'issued'
                ? <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
                : <XCircle className="w-12 h-12 mx-auto text-destructive" />}
              <p className="font-bold">{receipt.status === 'issued' ? 'سند صحيح وساري' : 'هذا السند ملغى'}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm text-right">
                <dt className="text-muted-foreground">رقم السند</dt><dd className="font-mono">{receipt.receipt_number}</dd>
                <dt className="text-muted-foreground">التاريخ</dt><dd>{dates?.hijri} — {dates?.gregorian}</dd>
                <dt className="text-muted-foreground">المبلغ</dt><dd>{fmt(Number(receipt.amount))} ريال</dd>
              </dl>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="font-bold">لم يُعثر على سند بهذا الرمز</p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default VerifyReceipt;
