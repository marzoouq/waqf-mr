/**
 * Page hook: BiometricSettings — wrapper that triggers initial fetch.
 */
import { useEffect } from 'react';
import { useWebAuthn } from '@/hooks/auth/useWebAuthn';

export const useBiometricSettings = () => {
  const webauthn = useWebAuthn();

  useEffect(() => {
    webauthn.fetchCredentials();
  }, [webauthn.fetchCredentials]); // eslint-disable-line react-hooks/exhaustive-deps

  return webauthn;
};
