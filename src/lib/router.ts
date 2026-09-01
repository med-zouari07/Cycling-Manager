import { useEffect, useState } from 'react';

export type Route =
  | 'dashboard'
  | 'vtt'
  | 'route'
  | 'clubs'
  | 'riders'
  | 'categories'
  | 'championships'
  | 'cups'
  | 'stages'
  | 'races'
  | 'registrations'
  | 'results'
  | 'rankings'
  | 'calendar'
  | 'stats'
  | 'notifications'
  | 'admin';

const ROUTES: Route[] = [
  'dashboard', 'vtt', 'route', 'clubs', 'riders', 'categories', 'championships', 'cups',
  'stages', 'races', 'registrations', 'results', 'rankings', 'calendar',
  'stats', 'notifications', 'admin',
];

export function getRoute(): Route {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  return (ROUTES.includes(h as Route) ? h : 'dashboard') as Route;
}

export function navigate(route: Route) {
  window.location.hash = `/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(getRoute());
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
