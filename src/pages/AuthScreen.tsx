import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        await signUp(email, password);
        setInfo('Compte créé. Vous pouvez vous connecter.');
        setMode('login');
      } else {
        await resetPassword(email);
        setInfo('Email de réinitialisation envoyé si le compte existe.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — FTC navy + Tunisian red accent */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-950">
        {/* Tunisian flag-inspired diagonal stripe */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Red accent stripe */}
        <div className="absolute top-0 right-0 w-1.5 h-full bg-ftcred-500" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-4">
            <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="w-16 h-16 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-xl font-bold">Fédération Tunisienne de Cyclisme</h1>
              <p className="text-sm text-primary-200">Plateforme de Gestion</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-extrabold leading-tight">
              Gérez vos championnats,<br />coupes et classements<br />en toute fluidité.
            </h2>
            <p className="text-primary-200 text-lg max-w-md">
              Une plateforme complète pour fédérations, clubs et organisateurs :
              inscriptions, résultats, points et classements automatisés.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                ['Championnats', 'Multi-manches'],
                ['Classements', 'Temps réel'],
                ['Résultats', 'Points auto'],
              ].map(([t, s]) => (
                <div key={t} className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/10">
                  <div className="font-semibold text-sm">{t}</div>
                  <div className="text-xs text-primary-200">{s}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-primary-300">© 2026 Fédération Tunisienne de Cyclisme</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="w-16 h-16 object-contain" />
            <span className="font-bold text-lg text-center">Fédération Tunisienne de Cyclisme</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
            {mode === 'login'
              ? 'Accédez à votre espace de gestion.'
              : mode === 'signup'
              ? 'Rejoignez la plateforme en quelques secondes.'
              : 'Saisissez votre email pour réinitialiser.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@ftc.tn"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="rounded-xl bg-primary-50 dark:bg-primary-600/10 border border-primary-100 dark:border-primary-600/20 px-4 py-3 text-sm text-primary-700 dark:text-primary-300">
                Les nouveaux comptes sont créés comme comptes d'association. L'administrateur peut ensuite les désactiver depuis son espace.
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/30 px-4 py-3 text-sm text-error-700 dark:text-error-400">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30 px-4 py-3 text-sm text-success-700 dark:text-success-400">
                {info}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer le compte' : 'Envoyer le lien'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm text-gray-500 dark:text-slate-400">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); setInfo(null); }} className="text-left hover:text-primary-600">
                  Mot de passe oublié ?
                </button>
                <button onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="text-left hover:text-primary-600">
                  Pas encore de compte ? <span className="font-semibold">Inscription</span>
                </button>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="text-left hover:text-primary-600">
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
