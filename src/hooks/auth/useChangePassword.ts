/**
 * هوك تغيير كلمة المرور — مستخرج من PasswordTab
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { defaultNotify } from '@/lib/notify';

export const useChangePassword = () => {
  const [loading, setLoading] = useState(false);

  const changePassword = async (password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      defaultNotify.success('تم تغيير كلمة المرور بنجاح');
      return true;
    } catch (err: unknown) {
      defaultNotify.error(getSafeErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading };
};
