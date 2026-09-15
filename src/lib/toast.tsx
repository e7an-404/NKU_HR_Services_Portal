import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Database,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'db';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  details?: string;
  duration?: number;
  timestamp: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastEventManager {
  private listeners: Set<ToastListener> = new Set();
  private toasts: ToastItem[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener([...this.toasts]);
    }
  }

  show(toast: Omit<ToastItem, 'id' | 'timestamp'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = toast.duration ?? (toast.type === 'error' ? 7000 : 4500);
    const newToast: ToastItem = {
      ...toast,
      id,
      duration,
      timestamp: Date.now(),
    };

    // Keep max 5 toasts visible to prevent screen clutter
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toastManager = new ToastEventManager();

export const toast = {
  success(title: string, message?: string, details?: string, duration?: number) {
    return toastManager.show({ type: 'success', title, message, details, duration });
  },
  error(title: string, message?: string, details?: string, duration?: number) {
    return toastManager.show({ type: 'error', title, message, details, duration });
  },
  warning(title: string, message?: string, details?: string, duration?: number) {
    return toastManager.show({ type: 'warning', title, message, details, duration });
  },
  info(title: string, message?: string, details?: string, duration?: number) {
    return toastManager.show({ type: 'info', title, message, details, duration });
  },
  db(title: string, message?: string, details?: string, duration?: number) {
    return toastManager.show({ type: 'db', title, message, details, duration });
  },
  dismiss(id: string) {
    toastManager.dismiss(id);
  },
};

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => string;
  dismissToast: (id: string) => void;
  toast: typeof toast;
  success: (title: string, message?: string, details?: string, duration?: number) => string;
  error: (title: string, message?: string, details?: string, duration?: number) => string;
  warning: (title: string, message?: string, details?: string, duration?: number) => string;
  info: (title: string, message?: string, details?: string, duration?: number) => string;
  db: (title: string, message?: string, details?: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe((items) => {
      setToasts(items);
    });
  }, []);

  const showToast = useCallback((t: Omit<ToastItem, 'id' | 'timestamp'>) => {
    return toastManager.show(t);
  }, []);

  const dismissToast = useCallback((id: string) => {
    toastManager.dismiss(id);
  }, []);

  const contextValue: ToastContextValue = {
    toasts,
    showToast,
    dismissToast,
    toast,
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    db: toast.db,
    dismiss: toast.dismiss,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      showToast: (t: Omit<ToastItem, 'id' | 'timestamp'>) => toastManager.show(t),
      dismissToast: (id: string) => toastManager.dismiss(id),
      toast,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      db: toast.db,
      dismiss: toast.dismiss,
    };
  }
  return ctx;
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifikasi Sistem"
      className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </aside>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const [showDetail, setShowDetail] = useState(false);

  const getStyle = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
          border: 'border-emerald-500/30 dark:border-emerald-500/40',
          bg: 'bg-white dark:bg-[#121215] text-slate-900 dark:text-white',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          indicator: 'bg-emerald-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
          border: 'border-rose-500/40 dark:border-rose-500/50',
          bg: 'bg-white dark:bg-[#121215] text-slate-900 dark:text-white',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          indicator: 'bg-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
          border: 'border-amber-500/30 dark:border-amber-500/40',
          bg: 'bg-white dark:bg-[#121215] text-slate-900 dark:text-white',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          indicator: 'bg-amber-500',
        };
      case 'db':
        return {
          icon: <Database className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
          border: 'border-sky-500/40 dark:border-sky-500/50',
          bg: 'bg-white dark:bg-[#121215] text-slate-900 dark:text-white',
          badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
          indicator: 'bg-sky-500',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
          border: 'border-sky-500/30 dark:border-sky-500/40',
          bg: 'bg-white dark:bg-[#121215] text-slate-900 dark:text-white',
          badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
          indicator: 'bg-sky-500',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-2xl border ${style.border} ${style.bg} p-4 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-300 relative overflow-hidden`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.indicator}`} />

      <div className="flex items-start gap-3 pl-1">
        {style.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {item.title}
            </h5>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
              {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {item.message && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">
              {item.message}
            </p>
          )}

          {item.details && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetail(!showDetail)}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{showDetail ? 'Sembunyikan Rincian Teknis' : 'Lihat Rincian Teknis / Error'}</span>
              </button>

              {showDetail && (
                <div className="mt-1.5 p-2 rounded-lg bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-[10px] font-mono text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                  {item.details}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0 -mr-1 -mt-1"
          title="Tutup Notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
