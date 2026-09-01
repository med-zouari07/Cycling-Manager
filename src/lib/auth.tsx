import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Role } from './supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  isActive: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const getMetadataRole = (user: User | null): Role => {
  const value = user?.user_metadata?.role as Role | undefined;
  return value && ['super_admin', 'admin', 'organizer', 'commissaire', 'club', 'rider'].includes(value) ? value : 'club';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>('club');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (nextSession: Session | null) => {
    if (!nextSession) {
      setRole('club');
      setIsActive(true);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', nextSession.user.id)
      .maybeSingle();
    setRole((data?.role as Role | undefined) ?? getMetadataRole(nextSession.user));
    setIsActive(data?.is_active ?? true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        await loadProfile(sess);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    role,
    isActive,
    loading,
    async signUp(email, password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      await loadProfile(data.session);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
