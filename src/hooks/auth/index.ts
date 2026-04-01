export { useAuth } from './useAuthContext';
export { useUserManagement } from './useUserManagement';
export { isBiometricEnabled, useWebAuthn } from './useWebAuthn';
export {
  getDeviceName,
  handleAuthenticationError,
  handleRegistrationError,
  logBiometricEvent,
} from '@/constants/auth/webAuthnErrors';
