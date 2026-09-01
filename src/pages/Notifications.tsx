import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Notification } from '../lib/types';
import { PageHeader, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { formatDateTime } from '../lib/hooks';
import { Bell, Plus, Check, Trash2, Send } from 'lucide-react';
import { Modal } from '../components/ui';

const TYPE: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' }> = {
  info: { label: 'Info', color: 'blue' }, competition: { label: 'Compétition', color: 'green' },
  registration: { label: 'Inscription', color: 'yellow' }, results: { label: 'Résultats', color: 'gray' }, warning: { label: 'Alerte', color: 'red' },
};

export default function Notifications() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', type: 'info' as Notification['type'] });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    load();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('notifications').insert({ ...form, is_global: admin });
    setOpen(false);
    setForm({ title: '', body: '', type: 'info' });
    load();
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${items.filter((n) => !n.is_read).length} non lue(s)`} action={admin && <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle</button>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : items.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`card p-4 flex items-start gap-3 ${!n.is_read ? 'border-l-4 border-l-primary-500' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center shrink-0"><Bell className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><h3 className="font-medium">{n.title}</h3><Badge color={TYPE[n.type].color}>{TYPE[n.type].label}</Badge>{!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500" />}</div>
                {n.body && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!n.is_read && <button onClick={() => markRead(n.id)} className="btn-ghost !p-1.5" title="Marquer lu"><Check className="w-4 h-4" /></button>}
                {admin && <button onClick={() => remove(n.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle notification">
        <form onSubmit={create} className="space-y-4">
          <div><label className="label">Titre *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></div>
          <div><label className="label">Message</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Notification['type'] })} className="input">{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary"><Send className="w-4 h-4" /> Envoyer</button></div>
        </form>
      </Modal>
    </div>
  );
}
