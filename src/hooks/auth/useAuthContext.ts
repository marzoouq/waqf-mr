/**
 * هوكات المصادقة — مفصولة إلى State و Actions لتقليل إعادة التصيير
 * useAuth() = backward-compatible (state + actions)
 * useAuthState() = state فقط (user, session, role, loading)
 * useAuthActions() = actions فقط (signIn, signOut, signUp, refreshRole) — مراجع مستقرة
 */
import { useContext, createContext } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { AppRole } from '@/types';
import { logger } from '@/lib/logger';

// === State Context ===
export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

export const defaultAuthState: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: true,
};

export const AuthStateContext = createContext<AuthState>(defaultAuthState);

// === Actions Context ===
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const fallbackActions: AuthActions = {
  signIn: async () => ({ error: new Error('تعذر تهيئة المصادقة') }),
  signUp: async () => ({ error: new Error('تعذر تهيئة المصادقة') }),
  signOut: async () => {},
  refreshRole: async () => {},
};

export const AuthActionsContext = createContext<AuthActions>(fallbackActions);

// === Combined type (backward compat) ===
export type AuthContextType = AuthState & AuthActions;

// === Hooks ===

/** يُرجع حالة المصادقة + الإجراءات (متوافق مع الكود القديم) */
export const useAuth = (): AuthContextType => {
  const state = useContext(AuthStateContext);
  const actions = useContext(AuthActionsContext);
  if (state === defaultAuthState) {
    logger.error('[Auth] useAuth called outside AuthProvider');
  }
  return { ...state, ...actions };
};

/** يُرجع حالة المصادقة فقط — للمكونات الحساسة للأداء */
export const useAuthState = (): AuthState => {
  return useContext(AuthStateContext);
};

/** يُرجع إجراءات المصادقة فقط — مراجع مستقرة لا تسبب إعادة تصيير */
export const useAuthActions = (): AuthActions => {
  return useContext(AuthActionsContext);
};
