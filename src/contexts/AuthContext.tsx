/**
 * سياق المصادقة (AuthContext)
 * يدير حالة تسجيل الدخول والخروج وجلب دور المستخدم من جدول user_roles.
 * 
 * إصلاح معماري: فصل جلب الدور عن onAuthStateChange لتجنب race condition
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useQuery } from '@tanstack/react-query';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const roleFetchIdRef = useRef(0);

  // === الخطوة 1: onAuthStateChange يحدّث user/session فقط (بدون await) ===
  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.warn('[Auth] onAuthStateChange:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (!currentSession?.user) {
          setRole(null);
          setLoading(false);
        }
        setAuthReady(true);
        initialSessionHandled = true;
      }
    );

    // Fallback: getSession for initial load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!initialSessionHandled) {
        console.warn('[Auth] getSession fallback used');
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
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchId = ++roleFetchIdRef.current;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchRole = async () => {
      const startTime = Date.now();
      let attempts = 0;
      console.warn('[Auth] fetchRole started for user:', user.id);
      
      // Safety timeout: 5 seconds max
      timeoutId = setTimeout(() => {
        if (roleFetchIdRef.current === fetchId) {
          console.warn('[Auth] fetchRole timeout after 5s, forcing loading=false');
          setLoading(false);
        }
      }, 5000);

      for (let attempt = 0; attempt <= 2; attempt++) {
        attempts = attempt + 1;
        // Check if this fetch is still relevant
        if (roleFetchIdRef.current !== fetchId) {
          console.warn('[Auth] fetchRole aborted (stale)');
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
            console.warn('[Auth] fetchRole success:', data.role, `(${duration}ms, ${attempts} attempts)`);
            setRole(data.role as AppRole);
            setLoading(false);
            clearTimeout(timeoutId);
            // Log diagnostics to access_log
            logAccessEvent({
              event_type: 'role_fetch',
              user_id: user.id,
              metadata: { role: data.role, duration_ms: duration, attempts, status: 'success' },
            });
            return;
          }

          if (attempt < 2) {
            await new Promise(r => setTimeout(r, (attempt + 1) * 500));
          }
        } catch (err) {
          console.error('[Auth] fetchRole attempt', attempt, 'error:', err);
        }
      }

      // All retries exhausted
      if (roleFetchIdRef.current === fetchId) {
        const duration = Date.now() - startTime;
        console.warn('[Auth] fetchRole failed after all retries', `(${duration}ms)`);
        setRole(null);
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
    // On success, onAuthStateChange fires → user changes → useEffect fetches role
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('guard-signup', {
      body: { email, password }
    });
    if (error || data?.error) {
      return { error: new Error(data?.error || error?.message || 'خطأ في التسجيل') };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const { data: idleMinutes } = useQuery({
    queryKey: ['idle-timeout-setting'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'idle_timeout_minutes').maybeSingle();
      return data?.value ? parseInt(data.value, 10) : 15;
    },
    staleTime: 1000 * 60 * 5,
  });

  const timeoutMs = (idleMinutes ?? 15) * 60 * 1000;

  const handleIdleLogout = useCallback(async () => {
    await signOut();
    window.location.href = '/auth?reason=idle';
  }, []);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: timeoutMs,
    warningBefore: 60 * 1000,
    onIdle: handleIdleLogout,
  });

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut }}>
      {children}
      {session && (
        <IdleTimeoutWarning
          open={showWarning}
          remaining={remaining}
          onStayActive={stayActive}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
