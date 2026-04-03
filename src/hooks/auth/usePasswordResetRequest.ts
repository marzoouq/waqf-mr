/**
 * هوك لطلب إعادة تعيين كلمة المرور عبر البريد الإلكتروني
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/normalizeDigits';

export function usePasswordResetRequest(onSuccess?: () => void) {
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    if (!resetEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeArabicDigits(resetEmail), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast.error(getSafeErrorMessage(error));
    } else {
      toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
      onSuccess?.();
    }
  };

  return { resetEmail, setResetEmail, isLoading, handleRequest };
}
