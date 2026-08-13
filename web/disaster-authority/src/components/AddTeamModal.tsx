import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import clsx from 'clsx';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { createTeam } from '@/lib/api';

const SPECIALIZATIONS = [
  'SEARCH_RESCUE',
  'FIRE',
  'MEDICAL',
  'CYCLONE',
  'FLOOD',
  'EARTHQUAKE',
  'LANDSLIDE',
  'TSUNAMI',
  'OTHER',
];

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary';

interface AddTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddTeamModal({ open, onClose, onCreated }: AddTeamModalProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    team_name: '',
    phone: '',
    password: '',
    contact_phone: '',
    experience_level: 'ADVANCED',
    specialization: [] as string[],
    initial_lat: '',
    initial_lng: '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSkill = (s: string) =>
    set('specialization', form.specialization.includes(s) ? form.specialization.filter((x) => x !== s) : [...form.specialization, s]);

  const reset = () =>
    setForm({
      team_name: '',
      phone: '',
      password: '',
      contact_phone: '',
      experience_level: 'ADVANCED',
      specialization: [],
      initial_lat: '',
      initial_lng: '',
    });

  async function handleSubmit() {
    if (!form.team_name.trim() || !form.phone.trim() || !form.password.trim()) {
      toast.error('Missing details', 'Team name, login phone and password are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await createTeam({
        team_name: form.team_name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        contact_phone: form.contact_phone.trim() || undefined,
        experience_level: form.experience_level,
        specialization: form.specialization,
        initial_lat: form.initial_lat ? Number(form.initial_lat) : undefined,
        initial_lng: form.initial_lng ? Number(form.initial_lng) : undefined,
      });
      toast.success(
        'Team registered',
        `${res.team.team_name} · badge ${res.badge_number} · login: ${res.login_phone} / ${form.password}`,
      );
      reset();
      onCreated();
    } catch (err) {
      toast.error('Registration failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Register a new responder team"
      subtitle="Creates the login account and team profile. Share the phone + password with the unit."
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Team name *</label>
          <input
            className={inputCls}
            value={form.team_name}
            onChange={(e) => set('team_name', e.target.value)}
            placeholder="e.g. Urban Flood Rescue Unit 09"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Login phone (user id) *</label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 9xxxxxxxxx"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Login password *</label>
            <input
              className={inputCls}
              type="text"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="set a shared password"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Contact phone</label>
            <input
              className={inputCls}
              value={form.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="optional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Experience level</label>
            <select
              className={inputCls}
              value={form.experience_level}
              onChange={(e) => set('experience_level', e.target.value)}
            >
              <option value="ADVANCED">ADVANCED</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="BASIC">BASIC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Specializations (used for dispatch ranking)</label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALIZATIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                  form.specialization.includes(s)
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Initial lat</label>
            <input
              className={inputCls}
              value={form.initial_lat}
              onChange={(e) => set('initial_lat', e.target.value)}
              placeholder="optional, e.g. 11.0168"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Initial lng</label>
            <input
              className={inputCls}
              value={form.initial_lng}
              onChange={(e) => set('initial_lng', e.target.value)}
              placeholder="optional, e.g. 76.9558"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primaryDark disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Register team
        </button>
      </div>
    </Modal>
  );
}
