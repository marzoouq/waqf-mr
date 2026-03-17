/**
 * سياق المصادقة (AuthContext)
 * يدير حالة تسجيل الدخول والخروج وجلب دور المستخدم من جدول user_roles.
 * 
 * إصلاح معماري: فصل جلب الدور عن onAuthStateChange لتجنب race condition
 * إصلاح: استخدام roleRef لحل مشكلة stale closure في onAuthStateChange
 * تحسين HMR: نقل useAuth و AuthContext إلى ملف مستقل (useAuthContext.ts)
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { checkNewDeviceLogin } from '@/hooks/useSecurityAlerts';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { logger } from '@/lib/logger';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { clearSlowQueries } from '@/lib/performanceMonitor';
import { queryClient } from '@/lib/queryClient';
import { clearToasts } from '@/hooks/use-toast';
import { AuthContext } from '@/hooks/useAuthContext';

// إعادة تصدير useAuth للتوافقية مع الاستيراد القديم
export { useAuth } from '@/hooks/useAuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const roleFetchIdRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  // إصلاح stale closure: roleRef يقرأ القيمة الحالية دائماً
  const roleRef = useRef<AppRole | null>(null);

  const setRoleWithRef = useCallback((newRole: AppRole | null) => {
    roleRef.current = newRole;
    setRole(newRole);
  }, []);

  // === الخطوة 1: onAuthStateChange يحدّث user/session فقط (بدون await) ===
  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        const newUserId = currentSession?.user?.id ?? null;

        // حماية ضد الأحداث المتكررة لنفس المستخدم (INITIAL_SESSION + SIGNED_IN)
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newUserId && newUserId === lastUserIdRef.current && roleRef.current) {
          logger.info('[Auth] onAuthStateChange: duplicate event ignored for same user', event);
          return;
        }

        logger.info('[Auth] onAuthStateChange:', event);
        lastUserIdRef.current = newUserId;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (!currentSession?.user) {
          setRoleWithRef(null);
          setLoading(false);
          lastUserIdRef.current = null;
        }
        setAuthReady(true);
        initialSessionHandled = true;
      }
    );

    // Fallback: getSession for initial load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!initialSessionHandled) {
        logger.info('[Auth] getSession fallback used');
        setSession(s);
        setUser(s?.user ?? null);
        if (!s?.user) {
          setLoading(false);
        }
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // === الخطوة 2: useEffect منفصل لجلب الدور عند تغيّر user ===
  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setRoleWithRef(null);
      setLoading(false);
      return;
    }

    const fetchId = ++roleFetchIdRef.current;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fetchRole = async () => {
      const startTime = Date.now();
      let attempts = 0;
      logger.info('[Auth] fetchRole started for user:', user.id);
      
      // Safety timeout: 3 seconds max
      timeoutId = setTimeout(() => {
        if (roleFetchIdRef.current === fetchId) {
          logger.info('[Auth] fetchRole timeout after 3s, forcing loading=false');
          setLoading(false);
        }
      }, 3000);

      for (let attempt = 0; attempt <= 2; attempt++) {
        attempts = attempt + 1;
        if (roleFetchIdRef.current !== fetchId) {
          logger.info('[Auth] fetchRole aborted (stale)');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

          if (roleFetchIdRef.current !== fetchId) return;

          if (data && !error) {
            const duration = Date.now() - startTime;
            logger.info('[Auth] fetchRole success:', data.role, `(${duration}ms, ${attempts} attempts)`);
            setRoleWithRef(data.role as AppRole);
            setLoading(false);
            clearTimeout(timeoutId);
            logAccessEvent({
              event_type: 'role_fetch',
              user_id: user.id,
              metadata: { role: data.role, duration_ms: duration, attempts, status: 'success' },
            });
            // AL-1: فحص تسجيل الدخول من جهاز جديد
            checkNewDeviceLogin(user.id, user.email);
            return;
          }

          if (attempt < 2) {
            await new Promise(r => setTimeout(r, (attempt + 1) * 300));
          }
        } catch (err) {
          logger.error('[Auth] fetchRole attempt', attempt, 'error:', err);
        }
      }

      // All retries exhausted
      if (roleFetchIdRef.current === fetchId) {
        const duration = Date.now() - startTime;
        logger.info('[Auth] fetchRole failed after all retries', `(${duration}ms)`);
        setRoleWithRef(null);
        setLoading(false);
        clearTimeout(timeoutId);
        logAccessEvent({
          event_type: 'role_fetch',
          user_id: user.id,
          metadata: { duration_ms: duration, attempts, status: 'failed' },
        });
      }
    };

    fetchRole();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, authReady]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('guard-signup', {
      body: { email, password }
    });
    if (error || data?.error) {
      return { error: new Error(data?.error || getSafeErrorMessage(error)) };
    }
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('[Auth] signOut error (continuing cleanup):', err);
    } finally {
      setRoleWithRef(null);
      queryClient.clear();
      try {
        localStorage.removeItem('waqf_selected_fiscal_year');
        localStorage.removeItem('sidebar-open');
        localStorage.removeItem('pwa_last_seen_version');
        localStorage.removeItem('waqf_theme_color');
        localStorage.removeItem('waqf_notification_tone');
        localStorage.removeItem('waqf_notification_volume');
        localStorage.removeItem('waqf_notification_preferences');
        localStorage.removeItem('error_log_queue');
        localStorage.removeItem('waqf_notification_sound');
      } catch { /* storage unavailable */ }
      try { sessionStorage.removeItem('nidLockedUntil'); } catch { /* silent */ }
      clearSlowQueries();
      clearToasts();
    }
  };

  const refreshRole = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setRoleWithRef(data ? (data.role as AppRole) : null);
    } catch {
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({ title: 'تعذّر تحديث الدور', description: 'يرجى تحديث الصفحة', variant: 'destructive' });
      }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}
