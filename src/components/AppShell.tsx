import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { ROLE_LABELS, isReadOnly } from '../lib/supabase';
import { navigate, useRoute, type Route } from '../lib/router';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';
import {
  LayoutDashboard, Building2, Users, Tag, Trophy, Medal, Flag,
  ClipboardList, BarChart3, CalendarDays, Bell, Settings, Bike,
  Menu, X, Search, Sun, Moon, LogOut, ChevronRight, Mountain,
} from 'lucide-react';

interface NavItem {
  route: Route;
  label: string;
  icon: typeof LayoutDashboard;
  readOnly?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Pilotage',
    items: [
      { route: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, readOnly: true },
      { route: 'calendar', label: 'Calendrier', icon: CalendarDays, readOnly: true },
      { route: 'stats', label: 'Statistiques', icon: BarChart3, readOnly: true },
      { route: 'rankings', label: 'Classements', icon: Medal, readOnly: true },
    ],
  },
  {
    section: 'Disciplines',
    items: [
      { route: 'vtt', label: 'VTT', icon: Mountain, readOnly: true },
      { route: 'route', label: 'Route', icon: Bike, readOnly: true },
    ],
  },
  {
    section: 'Compétitions',
    items: [
      { route: 'championships', label: 'Championnats', icon: Trophy },
      { route: 'cups', label: 'Coupes', icon: Trophy },
      { route: 'stages', label: 'Manches', icon: Flag },
      { route: 'races', label: 'Courses', icon: Bike },
    ],
  },
  {
    section: 'Participants',
    items: [
      { route: 'clubs', label: 'Clubs', icon: Building2 },
      { route: 'riders', label: 'Coureurs', icon: Users },
      { route: 'categories', label: 'Catégories', icon: Tag },
      { route: 'registrations', label: 'Inscriptions', icon: ClipboardList },
    ],
  },
  {
    section: 'Exploitation',
    items: [
      { route: 'results', label: 'Résultats', icon: BarChart3 },
      { route: 'notifications', label: 'Notifications', icon: Bell, readOnly: true },
      { route: 'admin', label: 'Administration', icon: Settings },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const route = useRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      setNotifs((data as Notification[]) ?? []);
    })();
  }, [route]);

  const unread = notifs.filter((n) => !n.is_read).length;
  const readOnly = isReadOnly(role);

  const filteredNav = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.filter((i) => (readOnly ? i.readOnly : true)),
      })),
    [readOnly],
  );

  const go = (r: Route) => {
    navigate(r);
    setSidebarOpen(false);
  };

  const markAllRead = async () => {
    const ids = notifs.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-72 shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-slate-800">
            <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="w-10 h-10 object-contain rounded-lg" />
            <div className="leading-tight">
              <div className="font-bold text-sm">FTC Manager</div>
              <div className="text-[11px] text-gray-400">Fédération Tunisienne de Cyclisme</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {filteredNav.map((group) => (
              <div key={group.section}>
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.section}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = route === item.route;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.route}
                        onClick={() => go(item.route)}
                        className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? 'bg-primary-50 dark:bg-primary-600/15 text-primary-700 dark:text-primary-300'
                            : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        {item.label}
                        {active && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="grid place-items-center w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                {(user?.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user?.email}</div>
                <div className="text-[11px] text-gray-400">{ROLE_LABELS[role]}</div>
              </div>
              <button onClick={signOut} title="Déconnexion" className="text-gray-400 hover:text-error-500">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher coureur, club, compétition..."
              className="input pl-10 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggle} className="btn-ghost !p-2.5" title="Thème">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="btn-ghost !p-2.5 relative"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 card p-0 z-40 animate-scale-in overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">Aucune notification</div>
                      ) : (
                        notifs.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800/50 ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-600/5' : ''}`}>
                            <div className="text-sm font-medium">{n.title}</div>
                            {n.body && <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          <div key={route} className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
