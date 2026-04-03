import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2 } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { isBiometricEnabled } from '@/hooks/auth/useWebAuthn';
import { useBiometricAuth } from '@/hooks/auth/useBiometricAuth';

export default function BiometricLoginButton() {
  const showBiometric = browserSupportsWebAuthn() && isBiometricEnabled();
  const { biometricLoading, handleBiometricLogin } = useBiometricAuth();

  // مساحة محجوزة ثابتة لمنع القفزات البصرية (CLS) عند ظهور/اختفاء الزر
  if (!showBiometric) return <div className="min-h-[2.75rem]" aria-hidden />;

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
