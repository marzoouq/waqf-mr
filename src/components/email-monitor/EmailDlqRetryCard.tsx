/**
 * EmailDlqRetryCard — أزرار إعادة محاولة الرسائل الفاشلة (DLQ)
 *
 * #A7: نستخدم retryingQueue بدلاً من isRetrying المشترك كي لا يتعطّل زر الطابور
 * الآخر أثناء معالجة طابور واحد.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

type DlqQueue = 'auth_emails' | 'transactional_emails';

interface EmailDlqRetryCardProps {
  authDlqCount: number;
  transactionalDlqCount: number;
  retryingQueue: DlqQueue | null;
  onRetry: (queue: DlqQueue) => void;
}

export const EmailDlqRetryCard = ({
  authDlqCount, transactionalDlqCount, retryingQueue, onRetry,
}: EmailDlqRetryCardProps) => {
  const authBusy = retryingQueue === 'auth_emails';
  const txBusy = retryingQueue === 'transactional_emails';
  const anyBusy = retryingQueue !== null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          إعادة محاولة الرسائل الفاشلة (DLQ)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          onClick={() => onRetry('auth_emails')}
          disabled={anyBusy || authDlqCount === 0}
        >
          <RotateCcw className={cn('w-4 h-4', authBusy && 'animate-spin')} />
          إعادة محاولة بريد المصادقة ({authDlqCount})
        </Button>
        <Button
          variant="destructive"
          onClick={() => onRetry('transactional_emails')}
          disabled={anyBusy || transactionalDlqCount === 0}
        >
          <RotateCcw className={cn('w-4 h-4', txBusy && 'animate-spin')} />
          إعادة محاولة البريد التشغيلي ({transactionalDlqCount})
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          يقرأ حتى 50 رسالة من DLQ ويعيدها إلى الطابور الأصلي.
        </p>
      </CardContent>
    </Card>
  );
};
