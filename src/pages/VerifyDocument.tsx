import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVerifyDocumentPage } from '@/hooks/page/public/useVerifyDocumentPage';
import { formatHijriGregorian } from '@/utils/format/hijriDate';

const TYPE_LABEL: Record<string, string> = { disbursement_voucher: 'سند صرف' };

const VerifyDocument = () => {
  const { valid, document, isLoading } = useVerifyDocumentPage();
  const found = valid && document;
  const dates = document ? formatHijriGregorian(document.issued_at.slice(0, 10)) : null;
  const active = document?.status === 'issued';

  return (
    <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-amiri text-2xl">التحقق من وثيقة رسمية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          ) : found ? (
            <>
              {active
                ? <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
                : <XCircle className="w-12 h-12 mx-auto text-destructive" />}
              <p className="font-bold">{active ? 'وثيقة صادرة من الوقف وصحيحة' : 'هذه الوثيقة ملغاة'}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm text-right">
                <dt className="text-muted-foreground">رقم الوثيقة</dt><dd className="font-mono">{document.doc_number}</dd>
                <dt className="text-muted-foreground">النوع</dt><dd>{TYPE_LABEL[document.doc_type] ?? 'تقرير'}</dd>
                <dt className="text-muted-foreground">تاريخ الإصدار</dt><dd>{dates?.hijri} — {dates?.gregorian}</dd>
                {document.page_count ? (<><dt className="text-muted-foreground">عدد الصفحات</dt><dd>{document.page_count}</dd></>) : null}
              </dl>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="font-bold">لم يُعثر على وثيقة بهذا الرمز</p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default VerifyDocument;
