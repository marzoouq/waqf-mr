/**
 * Page hook: BiometricSettings — wrapper that triggers initial fetch.
 */
import { useEffect } from 'react';
import { useWebAuthn } from '@/hooks/auth/biometric/useWebAuthn';

export const useBiometricSettings = () => {
  const webauthn = useWebAuthn();

  useEffect(() => {
    webauthn.fetchCredentials();
  }, [webauthn.fetchCredentials]); // eslint-disable-line react-hooks/exhaustive-deps

  return webauthn;
};
