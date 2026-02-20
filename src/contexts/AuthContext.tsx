/**
 * سياق المصادقة (AuthContext)
 * يدير حالة تسجيل الدخول والخروج وجلب دور المستخدم من جدول user_roles.
 * يوفر: user, session, role, loading, signIn, signUp, signOut
 * 
 * الأدوار المدعومة: admin (ناظر), beneficiary (مستفيد), waqif (واقف)
 * يتم جلب الدور تلقائياً عند تسجيل الدخول ومسحه عند الخروج.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
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

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      setRole(data.role as AppRole);
    } else {
      setRole(null);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
        }
        setLoading(false);
        initialSessionHandled = true;
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!initialSessionHandled) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
