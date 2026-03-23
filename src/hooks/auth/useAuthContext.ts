/**
 * Hook مستقل لـ useAuth — مفصول عن AuthContext لتحسين HMR
 * استخدم هذا الملف للاستيراد في المكونات بدلاً من AuthContext مباشرة
 */
import { useContext, createContext } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { AppRole } from '@/types/database';
import { logger } from '@/lib/logger';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

export const fallbackAuthContext: AuthContextType = {
  user: null,
  session: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: new Error('تعذر تهيئة المصادقة') }),
  signUp: async () => ({ error: new Error('تعذر تهيئة المصادقة') }),
  signOut: async () => {},
  refreshRole: async () => {},
};

export const AuthContext = createContext<AuthContextType>(fallbackAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === fallbackAuthContext) {
    logger.error('[Auth] useAuth called outside AuthProvider');
  }
  return context;
};
