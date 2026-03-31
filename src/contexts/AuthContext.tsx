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
import { logAccessEvent } from '@/hooks/data/useAccessLog';
import { checkNewDeviceLogin } from '@/hooks/data/useSecurityAlerts';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { logger } from '@/lib/logger';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { fetchUserRole } from '@/utils/auth/fetchUserRole';
import { clearSlowQueries } from '@/lib/performanceMonitor';
import { clearPageLoadEntries } from '@/lib/pagePerformanceTracker';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { AuthContext } from '@/hooks/auth/useAuthContext';

// مفاتيح التخزين المحلي القابلة للمسح عند تسجيل الخروج
const CLEARABLE_STORAGE_KEYS = [
  'waqf_selected_fiscal_year',
  'sidebar-open',
  'pwa_last_seen_version',
  'waqf_theme_color',
  'waqf_notification_tone',
  'waqf_notification_volume',
  'waqf_notification_preferences',
  'error_log_queue',
  'waqf_notification_sound',
  'page_perf_entries',
] as const;

// إعادة تصدير useAuth للتوافقية مع الاستيراد القديم
export { useAuth } from '@/hooks/auth/useAuthContext';

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
  // مرجع لـ timeout شبكة أمان signIn — يُلغى عند وصول الحدث أو signOut
  const signInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSignInTimeout = useCallback(() => {
    if (signInTimeoutRef.current) {
      clearTimeout(signInTimeoutRef.current);
      signInTimeoutRef.current = null;
    }
  }, []);

  const setRoleWithRef = useCallback((newRole: AppRole | null) => {
    roleRef.current = newRole;
    setRole(newRole);
  }, []);

  // === الخطوة 1: onAuthStateChange يحدّث user/session فقط (بدون await) ===
  // إصلاح Lock warning: إزالة getSession() المتوازي والاعتماد على INITIAL_SESSION فقط
  // إضافة حارس isMounted لمنع تحديث الحالة بعد unmount في StrictMode
  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;

        const newUserId = currentSession?.user?.id ?? null;

        // حماية ضد الأحداث المتكررة لنفس المستخدم (INITIAL_SESSION + SIGNED_IN)
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newUserId && newUserId === lastUserIdRef.current && roleRef.current) {
          logger.info('[Auth] onAuthStateChange: duplicate event ignored for same user', event);
          return;
        }

        logger.info('[Auth] onAuthStateChange:', event);
        // إلغاء timeout شبكة الأمان عند وصول أي حدث مصادقة
        clearSignInTimeout();
        lastUserIdRef.current = newUserId;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (!currentSession?.user) {
          setRoleWithRef(null);
          setLoading(false);
          lastUserIdRef.current = null;
        }
        setAuthReady(true);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearSignInTimeout();
    };
  }, [setRoleWithRef, clearSignInTimeout]);

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
      logger.info('[Auth] fetchRole started');
      
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
          const result = await fetchUserRole(user.id);

          if (roleFetchIdRef.current !== fetchId) return;

          if (result.role && !result.error) {
            const duration = Date.now() - startTime;
            logger.info('[Auth] fetchRole success:', result.role, `(${duration}ms, ${attempts} attempts)`);
            setRoleWithRef(result.role);
            setLoading(false);
            clearTimeout(timeoutId);
            logAccessEvent({
              event_type: 'role_fetch',
              user_id: user.id,
              metadata: { role: result.role, duration_ms: duration, attempts, status: 'success' },
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
  }, [user, authReady, setRoleWithRef]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    } else {
      // شبكة أمان: إذا لم يصل حدث onAuthStateChange خلال 8 ثوانٍ
      clearSignInTimeout();
      signInTimeoutRef.current = setTimeout(() => {
        signInTimeoutRef.current = null;
        setLoading(false);
      }, 8000);
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
    clearSignInTimeout();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('[Auth] signOut error (continuing cleanup):', err);
    } finally {
      setRoleWithRef(null);
      queryClient.clear();
      try {
        CLEARABLE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      } catch { /* storage unavailable */ }
      try { sessionStorage.removeItem('nidLockedUntil'); } catch { /* silent */ }
      clearSlowQueries();
      clearPageLoadEntries();
      toast.dismiss();
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
      toast.error('تعذّر تحديث الدور — يرجى تحديث الصفحة');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}
