import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ftdzdcyhbtpcjwodshen.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZHpkY3loYnRwY2p3b2RzaGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MjgyMDQsImV4cCI6MjA5ODEwNDIwNH0.6DYj2wRWLvg1sJgouko8qT0nFq57asfl-ZJLZk-rjcQ';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_KEY;

if (!url || !anonKey) {
  console.error(
    'Supabase credentials missing. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Role =
  | 'super_admin'
  | 'admin'
  | 'organizer'
  | 'commissaire'
  | 'club'
  | 'rider';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  organizer: 'Organisateur',
  commissaire: 'Commissaire',
  club: 'Club',
  rider: 'Coureur',
};

export const ROLE_ORDER: Role[] = [
  'super_admin',
  'admin',
  'organizer',
  'commissaire',
  'club',
  'rider',
];

export const isReadOnly = (role: Role) => role === 'rider';
export const canManage = (role: Role) => role !== 'rider';
export const isAdmin = (role: Role) => role === 'admin' || role === 'super_admin';
