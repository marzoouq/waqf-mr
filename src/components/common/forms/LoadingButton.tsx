/**
 * LoadingButton — زر مع حالة تحميل مدمجة
 *
 * يلفّ Button القياسي ويضيف spinner وتعطيل تلقائي أثناء mutations.
 * لا يكسر API الـ Button الحالي — يضيف فقط `loading` و `loadingText`.
 */
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface LoadingButtonProps extends ButtonProps {
  /** إظهار spinner وتعطيل الزر */
  loading?: boolean;
  /** نص بديل أثناء التحميل (اختياري) */
  loadingText?: string;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, disabled, children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  },
);
LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;
