import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { useRoute } from './lib/router';
import AppShell from './components/AppShell';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';
import VTT from './pages/VTT';
import Route from './pages/Route';
import Clubs from './pages/Clubs';
import Riders from './pages/Riders';
import Categories from './pages/Categories';
import Championships from './pages/Championships';
import Cups from './pages/Cups';
import Stages from './pages/Stages';
import Races from './pages/Races';
import Registrations from './pages/Registrations';
import Results from './pages/Results';
import Rankings from './pages/Rankings';
import Calendar from './pages/Calendar';
import Stats from './pages/Stats';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import { Spinner } from './components/ui';

function Router() {
  const route = useRoute();
  switch (route) {
    case 'dashboard': return <Dashboard />;
    case 'vtt': return <VTT />;
    case 'route': return <Route />;
    case 'clubs': return <Clubs />;
    case 'riders': return <Riders />;
    case 'categories': return <Categories />;
    case 'championships': return <Championships />;
    case 'cups': return <Cups />;
    case 'stages': return <Stages />;
    case 'races': return <Races />;
    case 'registrations': return <Registrations />;
    case 'results': return <Results />;
    case 'rankings': return <Rankings />;
    case 'calendar': return <Calendar />;
    case 'stats': return <Stats />;
    case 'notifications': return <Notifications />;
    case 'admin': return <Admin />;
    default: return <Dashboard />;
  }
}

function Gate() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-slate-950">
        <Spinner />
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}
