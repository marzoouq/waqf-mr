import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Fingerprint, Loader2 } from 'lucide-react';
import { isBiometricEnabled } from '@/hooks/useWebAuthn';
import { supabase } from '@/integrations/supabase/client';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';

export default function BiometricLoginButton() {
  const [biometricLoading, setBiometricLoading] = useState(false);
  const showBiometric = browserSupportsWebAuthn() && isBiometricEnabled();

  if (!showBiometric) return null;

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options' },
      });
      if (optErr || !options) {
        toast.error('فشل في بدء عملية المصادقة');
        return;
      }
      const credential = await startAuthentication({ optionsJSON: options });
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential, challenge_id: options.challenge_id },
      });
      if (verErr || !result?.verified) {
        toast.error('فشل في التحقق من البصمة');
        return;
      }
      if (!result.access_token || !result.refresh_token) {
        toast.error('لم يتم استلام بيانات الجلسة');
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError) {
        toast.error('فشل في إنشاء الجلسة');
        return;
      }
      toast.success('تم تسجيل الدخول بالبصمة بنجاح');
    } catch (err: unknown) {
      const name = err instanceof DOMException || err instanceof Error ? err.name : '';
      const errMsg = err instanceof Error ? err.message : '';
      if (name === 'NotAllowedError') {
        if (errMsg.toLowerCase().includes('timeout')) {
          toast.error('انتهت مهلة المصادقة بالبصمة. أعد المحاولة');
        } else {
          toast.error('تم إلغاء عملية البصمة');
        }
      } else if (name === 'AbortError') {
        toast.error('تم إلغاء عملية المصادقة');
      } else if (errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch')) {
        toast.error('خطأ في الاتصال. تحقق من الإنترنت وأعد المحاولة');
      } else {
        toast.error('حدث خطأ أثناء المصادقة بالبصمة. أعد المحاولة أو سجّل الدخول بكلمة المرور');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 gap-2 border-primary/30 hover:bg-primary/5"
      disabled={biometricLoading}
      onClick={handleBiometricLogin}
    >
      {biometricLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Fingerprint className="w-5 h-5 text-primary" />
      )}
      تسجيل الدخول بالبصمة
    </Button>
  );
}
