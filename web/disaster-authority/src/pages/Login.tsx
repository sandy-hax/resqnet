import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Phone, ShieldAlert, Wifi } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loginRequest } from '@/lib/api';
import { Spinner } from '@/components/Feedback';
import { useToast } from '@/components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await loginRequest(phone.trim(), password);
      if (session.role !== 'AUTHORITY') {
        setError('This portal is restricted to AUTHORITY accounts.');
        setLoading(false);
        return;
      }
      login(session);
      toast.success('Authenticated', `Welcome, ${session.name}`);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Unable to reach the command backend. Is the API running on :8000?';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-sidebar p-8 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <ShieldAlert size={26} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">ReqQNet</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Command Center
                </div>
              </div>
            </div>
            <div className="mt-10 space-y-4">
              <h1 className="text-2xl font-bold leading-snug text-white">
                ReqQNet
                <br />
                District Command & Control
              </h1>
              <p className="text-sm leading-relaxed text-slate-400">
                ReqQNet — Command Center. Inspect incoming distress calls, verify legitimacy,
                direct pre-assigned disaster management teams and manage regional awareness programs
                — all from one live operations console.
              </p>
            </div>
          </div>
          <div className="space-y-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-success" />
              Live SOS telemetry over WebSocket (ws://localhost:8000/ws)
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-warning" />
              Restricted to AUTHORITY accounts only
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-8 sm:p-10">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                <ShieldAlert size={22} />
              </div>
              <div className="text-lg font-bold text-text">ReqQNet — Command Center</div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-text">Authority Sign In</h2>
          <p className="mt-1 text-sm text-muted">Mandatory authentication to access the console.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text">Phone number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="+91 12345 67890"
                  className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text">Password</label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-dangerLight px-3 py-2 text-xs font-medium text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryDark disabled:opacity-60"
            >
              {loading ? <Spinner size={16} className="text-white" /> : <ShieldAlert size={16} />}
              {loading ? 'Authenticating…' : 'Enter Command Center'}
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-bg px-3.5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Demo account</div>
            <div className="mt-1 text-xs text-slate-600">
              Phone: <code className="rounded bg-surface px-1 py-0.5 font-mono">+911234567890</code>
              <br />
              Password: <code className="rounded bg-surface px-1 py-0.5 font-mono">authority123</code>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
