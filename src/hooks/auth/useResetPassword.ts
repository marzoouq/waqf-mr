/**
 * هوك إعادة تعيين كلمة المرور — **الخطوة 2/2**: تنفيذ التغيير
 *
 * يُستخدم في صفحة `/reset-password` بعد أن يفتح المستخدم رابط الاسترداد المُرسَل من `usePasswordResetRequest`.
 * يستمع لحدث `PASSWORD_RECOVERY` من Supabase + يدعم تدفقات implicit و PKCE.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';

export function useResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // الاستماع لحدث PASSWORD_RECOVERY من Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // دعم التدفق القديم (implicit flow)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // فحص معاملات URL لدعم تدفق PKCE
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      defaultNotify.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      defaultNotify.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        defaultNotify.error(getSafeErrorMessage(error));
      } else {
        setSuccess(true);
        defaultNotify.success('تم تغيير كلمة المرور بنجاح');
      }
    } catch {
      defaultNotify.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    isRecovery,
    success,
    handleSubmit,
  };
}
