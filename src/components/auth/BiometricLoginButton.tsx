import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, Info } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { isBiometricEnabled, useWebAuthn } from '@/hooks/auth/biometric/useWebAuthn';

export default function BiometricLoginButton() {
  const isSupported = browserSupportsWebAuthn();
  const hasLocalFlag = isBiometricEnabled();
  const { isLoading: biometricLoading, authenticateWithBiometric } = useWebAuthn();

  if (!isSupported) {
    return (
      <p
        className="min-h-[2.75rem] flex items-center justify-center gap-2 text-xs text-muted-foreground text-center"
        role="status"
      >
        <Info className="w-3.5 h-3.5" />
        متصفحك لا يدعم تسجيل الدخول بالبصمة
      </p>
    );
  }

  if (!hasLocalFlag) {
    return (
      <p
        className="min-h-[2.75rem] flex items-center justify-center gap-2 text-xs text-muted-foreground text-center px-2"
        role="status"
      >
        <Fingerprint className="w-3.5 h-3.5 text-primary/60" />
        لتسجيل الدخول بالبصمة سجّل الدخول أولاً ثم فعّلها من الإعدادات
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 gap-2 border-primary/30 hover:bg-primary/5"
      disabled={biometricLoading}
      onClick={authenticateWithBiometric}
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
