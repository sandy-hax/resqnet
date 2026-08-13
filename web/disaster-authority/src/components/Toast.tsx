import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const kindStyles: Record<ToastKind, { icon: ReactNode; ring: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    ring: 'border-success/30',
    iconColor: 'text-success',
  },
  error: {
    icon: <AlertTriangle size={18} />,
    ring: 'border-danger/30',
    iconColor: 'text-danger',
  },
  info: {
    icon: <Info size={18} />,
    ring: 'border-sky-300',
    iconColor: 'text-sky-600',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error = useCallback((t: string, m?: string) => toast('error', t, m), [toast]);
  const info = useCallback((t: string, m?: string) => toast('info', t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {items.map((t) => {
          const s = kindStyles[t.kind];
          return (
            <div
              key={t.id}
              className={clsx(
                'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 shadow-lg animate-[slideIn_.2s_ease-out]',
                s.ring,
              )}
            >
              <span className={clsx('mt-0.5 shrink-0', s.iconColor)}>{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text">{t.title}</div>
                {t.message && <div className="mt-0.5 text-xs text-muted">{t.message}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-muted hover:text-text"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
