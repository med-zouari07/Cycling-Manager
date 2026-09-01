import { useEffect, useState } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { PointsScale, Profile } from '../lib/types';
import { PageHeader, Spinner, ErrorState, EmptyState, Badge } from '../components/ui';
import { DEFAULT_SCALE_EXPORT } from '../lib/points';
import { Settings, Plus, Trash2, Check, Save, Sliders, Users, UserPlus, Ban, RotateCcw } from 'lucide-react';

export default function Admin() {
  const { role, user } = useAuth();
  const admin = isAdmin(role);
  const [scales, setScales] = useState<PointsScale[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'points' | 'users' | 'settings' | 'account'>('points');
  const [editing, setEditing] = useState<PointsScale | null>(null);
  const [draft, setDraft] = useState({ name: '', scale: DEFAULT_SCALE_EXPORT.map((x) => ({ ...x })) });
  const [userForm, setUserForm] = useState({ email: '', password: '', club_name: '' });
  const [userError, setUserError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: scaleError } = await supabase.from('points_scales').select('*').order('created_at', { ascending: false });
    if (scaleError) setError(scaleError.message);
    setScales((data as PointsScale[]) ?? []);
    if (admin) {
      const { data: response, error: profileError } = await supabase.functions.invoke('admin-manage-users', { body: { action: 'list' } });
      if (profileError || response?.error) setUserError(profileError?.message ?? response?.error ?? 'Impossible de charger les comptes.');
      setProfiles((response?.users as Profile[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [admin]);

  const activate = async (id: string) => {
    await supabase.from('points_scales').update({ is_active: false }).neq('id', id);
    await supabase.from('points_scales').update({ is_active: true }).eq('id', id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Supprimer ce barème ?')) return;
    await supabase.from('points_scales').delete().eq('id', id);
    load();
  };
  const saveScale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await supabase.from('points_scales').update({ name: draft.name, scale: draft.scale }).eq('id', editing.id);
    else await supabase.from('points_scales').insert({ name: draft.name, scale: draft.scale, is_active: scales.length === 0 });
    setEditing(null); setDraft({ name: '', scale: DEFAULT_SCALE_EXPORT.map((x) => ({ ...x })) }); load();
  };
  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setUserError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-manage-users', { body: { action: 'create', email: userForm.email, password: userForm.password, role: 'club', club_name: userForm.club_name } });
    if (invokeError || data?.error) { setUserError(invokeError?.message ?? data?.error ?? 'Création impossible.'); return; }
    setUserForm({ email: '', password: '', club_name: '' }); load();
  };
  const toggleAccount = async (profile: Profile) => {
    const { data, error: invokeError } = await supabase.functions.invoke('admin-manage-users', { body: { action: 'toggle_active', user_id: profile.id, is_active: !profile.is_active } });
    if (invokeError || data?.error) { setUserError(invokeError?.message ?? data?.error ?? 'Action impossible.'); return; }
    load();
  };
  const updateScaleRow = (i: number, points: number) => setDraft((d) => ({ ...d, scale: d.scale.map((r, idx) => idx === i ? { ...r, points } : r) }));
  const resetDraft = () => { setEditing(null); setDraft({ name: '', scale: DEFAULT_SCALE_EXPORT.map((x) => ({ ...x })) }); };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  return <div>
    <PageHeader title="Administration" subtitle="Barème, comptes des associations et paramètres" />
    <div className="flex gap-2 mb-5 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
      {([['points', 'Barème des points', Sliders], ...(admin ? [['users', 'Associations', Users]] : []), ['settings', 'Paramètres', Settings], ['account', 'Compte', Settings]] as const).map(([t, label, Icon]) => <button key={t} onClick={() => setTab(t as typeof tab)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><Icon className="w-4 h-4 inline mr-1.5" />{label}</button>)}
    </div>

    {tab === 'users' && admin && <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div><div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Comptes des associations</h3><Badge color="blue">{profiles.filter((p) => p.role === 'club').length} compte(s)</Badge></div>
        {userError && <div className="mb-4"><ErrorState message={userError} /></div>}
        {profiles.filter((p) => p.role === 'club').length === 0 ? <EmptyState icon={Users} title="Aucun compte association" description="Créez le premier compte à droite." /> : <div className="space-y-2">{profiles.filter((p) => p.role === 'club').map((profile) => <div key={profile.id} className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 grid place-items-center"><Users className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="font-medium truncate">{profile.club_name || 'Association'}</div><div className="text-xs text-gray-400 truncate">{profile.email}</div></div><Badge color={profile.is_active ? 'green' : 'red'}>{profile.is_active ? 'Actif' : 'Fermé'}</Badge><button onClick={() => toggleAccount(profile)} className="btn-ghost !p-2" title={profile.is_active ? 'Fermer le compte' : 'Rouvrir le compte'}>{profile.is_active ? <Ban className="w-4 h-4 text-error-500" /> : <RotateCcw className="w-4 h-4 text-success-600" />}</button></div>)}</div>}
      </div>
      <div className="card p-5"><h3 className="font-semibold mb-4">Créer un compte association</h3><form onSubmit={createAccount} className="space-y-4"><div><label className="label">Nom de l'association *</label><input required value={userForm.club_name} onChange={(e) => setUserForm({ ...userForm, club_name: e.target.value })} className="input" /></div><div><label className="label">Email *</label><input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="input" /></div><div><label className="label">Mot de passe temporaire *</label><input required minLength={6} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="input" /></div><button className="btn-primary w-full"><UserPlus className="w-4 h-4" /> Créer le compte</button></form></div>
    </div>}

    {tab === 'points' && <div className="grid lg:grid-cols-2 gap-6"><div><div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Barèmes configurés</h3>{!admin && <button onClick={resetDraft} className="btn-secondary !py-2"><Plus className="w-4 h-4" /> Nouveau</button>}</div>{scales.length === 0 ? <EmptyState icon={Sliders} title="Aucun barème" description="Créez un barème de points." /> : <div className="space-y-2">{scales.map((s) => <div key={s.id} className="card p-4 flex items-center gap-3"><div className="flex-1"><h4 className="font-medium">{s.name}</h4><p className="text-xs text-gray-400">{s.scale.length} positions</p></div>{s.is_active ? <Badge color="green">Actif</Badge> : <button onClick={() => activate(s.id)} className="btn-ghost !py-1.5 text-xs">Activer</button>}<button onClick={() => { setEditing(s); setDraft({ name: s.name, scale: s.scale.map((x) => ({ ...x })) }); }} className="btn-ghost !p-1.5"><Settings className="w-4 h-4" /></button><button onClick={() => remove(s.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button></div>)}</div>}</div><div className="card p-5"><h3 className="font-semibold mb-4">{editing ? 'Modifier le barème' : 'Nouveau barème'}</h3><form onSubmit={saveScale} className="space-y-4"><div><label className="label">Nom du barème *</label><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input" /></div><div className="space-y-1.5 max-h-64 overflow-y-auto">{draft.scale.map((r, i) => <div key={i} className="flex items-center gap-2"><span className="w-10 text-sm text-gray-400">{r.position}e</span><input type="number" value={r.points} onChange={(e) => updateScaleRow(i, Number(e.target.value))} className="input !py-1.5 w-24" /><span className="text-xs text-gray-400">pts</span></div>)}</div><div className="flex justify-end gap-2"><button type="button" onClick={resetDraft} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Enregistrer</button></div></form></div></div>}
    {tab === 'settings' && <div className="card p-6 max-w-2xl"><h3 className="font-semibold mb-4">Paramètres généraux</h3><div className="space-y-4"><div><label className="label">Nom de la fédération</label><input className="input" placeholder="Fédération Tunisienne de Cyclisme" /></div><div><label className="label">Saison courante</label><input className="input" placeholder="2026" /></div><button className="btn-primary"><Check className="w-4 h-4" /> Enregistrer les paramètres</button></div></div>}
    {tab === 'account' && <div className="card p-6 max-w-2xl"><h3 className="font-semibold mb-4">Mon compte</h3><div className="font-medium">{user?.email}</div><div className="text-sm text-gray-400 mt-1">Rôle : {role}</div></div>}
  </div>;
}
