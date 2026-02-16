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
      .single();

    if (data && !error) {
      setRole(data.role as AppRole);
    } else {
      setRole(null);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
        setLoading(false);
        initialSessionHandled = true;
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialSessionHandled) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRole(session.user.id);
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
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const handleIdleLogout = useCallback(async () => {
    await signOut();
    window.location.href = '/auth?reason=idle';
  }, []);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: 15 * 60 * 1000, // 15 دقيقة
    warningBefore: 60 * 1000, // تحذير قبل 60 ثانية
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
