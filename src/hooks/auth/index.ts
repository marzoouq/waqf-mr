/**
 * Barrel exports — hooks/auth/
 */
export { useAuth, useAuthState, useAuthActions, AuthStateContext, AuthActionsContext, defaultAuthState } from './useAuthContext';
export type { AuthContextType, AuthState, AuthActions } from './useAuthContext';
export { useWebAuthn, isBiometricEnabled } from './useWebAuthn';
export { useChangePassword } from './useChangePassword';
export { usePasswordResetRequest } from './usePasswordResetRequest';
export { useResetPassword } from './useResetPassword';
export { useUserManagement } from './useUserManagement';
export { callAdminApi, useAdminUsers, useOrphanedBeneficiaries, useUnlinkedBeneficiaries } from './useUserManagementData';
export { useRegistrationEnabled } from '@/hooks/data/settings';
export type { ManagedUser } from './useUserManagementData';
export { useCreateUserMutation, useConfirmEmailMutation, useUpdateEmailMutation, useUpdatePasswordMutation, useSetRoleMutation, useDeleteUserMutation, useLinkBeneficiaryMutation, useToggleRegistration } from './useUserManagementMutations';

export { logBiometricEvent, handleRegistrationError, handleAuthenticationError, getDeviceName } from './webAuthnErrors';
export { useRoleRedirect } from './useRoleRedirect';
export { useLogoutFlow } from './useLogoutFlow';
