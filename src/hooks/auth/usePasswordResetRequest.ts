/**
 * هوك إعادة تعيين كلمة المرور — **الخطوة 1/2**: طلب الرابط
 *
 * يُرسل رابط استرداد إلى البريد الإلكتروني للمستخدم.
 * الخطوة 2 (تنفيذ التغيير الفعلي) في `useResetPassword` بعد فتح المستخدم للرابط.
 *
 * @param onSuccess - يُستدعى بعد إرسال الرابط بنجاح (مثلاً: إغلاق الـ Dialog)
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';

export function usePasswordResetRequest(onSuccess?: () => void) {
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async () => {
    if (!resetEmail) {
      defaultNotify.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeArabicDigits(resetEmail), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      defaultNotify.error(getSafeErrorMessage(error));
    } else {
      defaultNotify.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
      onSuccess?.();
    }
  };

  return { resetEmail, setResetEmail, isLoading, handleRequest };
}
