/**
 * توافق رجعي: نقل منطق أخطاء WebAuthn إلى constants/auth.
 */
export {
  getDeviceName,
  handleAuthenticationError,
  handleRegistrationError,
  logBiometricEvent,
} from '@/constants/auth/webAuthnErrors';
