/**
 * سياق المصادقة (AuthContext) — مُبسَّط في الموجة 18
 *
 * البنية:
 * - useAuthListener (sub-hook) يدير: state + onAuthStateChange + getSession fallback + JWT/DB role
 * - هذا الملف يدير: actions (signIn/signUp/signOut/refreshRole) + memoized contexts
 */
import React, { useCallback, useMemo } from 'react';
import { logAccessEvent as _logAccessEvent } from '@/lib/services/accessLogService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { fetchUserRole } from '@/lib/auth/fetchUserRole';
import { AuthStateContext, AuthActionsContext } from '@/hooks/auth/useAuthContext';
import { useAuthListener } from '@/hooks/auth/useAuthListener';
import { useAuthCleanup } from '@/hooks/auth/useAuthCleanup';

// إعادة تصدير للتوافقية مع الاستيراد القديم
export { useAuth, useAuthState, useAuthActions } from '@/hooks/auth/useAuthContext';

// تجنّب unused-import warning (الدالة كانت مستخدمة سابقاً مباشرة هنا)
void _logAccessEvent;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // === State + listener (مُستخرج إلى hook منفصل في الموجة 18) ===
  const { user, session, role, loading, setRole } = useAuthListener();

  // === إجراءات المصادقة (مراجع مستقرة) ===

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      // onAuthStateChange يتولى تحديث الحالة وإيقاف التحميل
      return { error: null };
    } catch (err) {
      logger.warn('[Auth] signIn unexpected error:', err);
      return { error: err instanceof Error ? err : new Error('حدث خطأ غير متوقع أثناء تسجيل الدخول') };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('guard-signup', {
      body: { email, password },
    });
    if (error || data?.error) {
      return { error: new Error(data?.error || getSafeErrorMessage(error)) };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('[Auth] signOut error:', err);
    } finally {
      setRole(null);
      queryClient.clear();
      // مسح كل مفاتيح localStorage المعروفة (مصدر واحد للحقيقة من storageKeys.ts)
      CLEARABLE_STORAGE_KEYS.forEach(key => safeRemove(key));
      // مسح مفاتيح sessionStorage الحساسة
      safeSessionRemove(STORAGE_KEYS.FISCAL_YEAR);
      safeSessionRemove(STORAGE_KEYS.NID_LOCKED_UNTIL);
      // #15: dynamic import — monitoring لا يحتاج في initial bundle
      import('@/lib/monitoring').then(m => {
        m.clearSlowQueries();
        m.clearPageLoadEntries();
      }).catch(() => { /* silent */ });
      toast.dismiss();
    }
  }, [setRole]);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    const { role: newRole, error } = await fetchUserRole(user.id);
    if (error) {
      logger.warn('[Auth] تعذّر تحديث الدور', error);
      return;
    }
    setRole(newRole);
  }, [user, setRole]);

  // === Memoize contexts لمنع إعادة التصيير غير الضرورية ===
  const stateValue = useMemo(
    () => ({ user, session, role, loading }),
    [user, session, role, loading]
  );

  const actionsValue = useMemo(
    () => ({ signIn, signUp, signOut, refreshRole }),
    [signIn, signUp, signOut, refreshRole]
  );

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}
