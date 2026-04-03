/**
 * Barrel exports — hooks/auth/
 */
export { useAuth, AuthContext, fallbackAuthContext } from './useAuthContext';
export type { AuthContextType } from './useAuthContext';
export { useBiometricAuth } from './useBiometricAuth';
export { useChangePassword } from './useChangePassword';
export { usePasswordResetRequest } from './usePasswordResetRequest';
export { useResetPassword } from './useResetPassword';
export { useUserManagement } from './useUserManagement';
export { callAdminApi, useRegistrationEnabled, useAdminUsers, useOrphanedBeneficiaries, useUnlinkedBeneficiaries } from './useUserManagementData';
export type { ManagedUser } from './useUserManagementData';
export { useCreateUserMutation, useConfirmEmailMutation, useUpdateEmailMutation, useUpdatePasswordMutation, useSetRoleMutation, useDeleteUserMutation, useLinkBeneficiaryMutation, useToggleRegistration } from './useUserManagementMutations';
export { useWebAuthn } from './useWebAuthn';
export { logBiometricEvent, handleRegistrationError, handleAuthenticationError, getDeviceName } from './webAuthnErrors';
