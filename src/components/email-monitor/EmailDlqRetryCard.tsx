/**
 * EmailDlqRetryCard — أزرار إعادة محاولة الرسائل الفاشلة (DLQ)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmailDlqRetryCardProps {
  authDlqCount: number;
  transactionalDlqCount: number;
  isRetrying: boolean;
  onRetry: (queue: 'auth_emails' | 'transactional_emails') => void;
}

export const EmailDlqRetryCard = ({
  authDlqCount, transactionalDlqCount, isRetrying, onRetry,
}: EmailDlqRetryCardProps) => (
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
        disabled={isRetrying || authDlqCount === 0}
      >
        <RotateCcw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
        إعادة محاولة بريد المصادقة ({authDlqCount})
      </Button>
      <Button
        variant="destructive"
        onClick={() => onRetry('transactional_emails')}
        disabled={isRetrying || transactionalDlqCount === 0}
      >
        <RotateCcw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
        إعادة محاولة البريد التشغيلي ({transactionalDlqCount})
      </Button>
      <p className="text-xs text-muted-foreground self-center">
        يقرأ حتى 50 رسالة من DLQ ويعيدها إلى الطابور الأصلي.
      </p>
    </CardContent>
  </Card>
);
