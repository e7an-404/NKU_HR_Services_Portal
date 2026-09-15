import React from 'react';
import { AlertTriangle, Database, ShieldAlert, X } from 'lucide-react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  details?: { label: string; value: string }[];
  loading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'warning',
  details,
  loading = false,
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isActuallyLoading = loading || internalLoading;

  // ESC key listener to close modal (Request 3)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActuallyLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isActuallyLoading]);

  // Reset internal loading when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setInternalLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (isActuallyLoading) return;
    setInternalLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Action error in ConfirmActionModal:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        };
      case 'primary':
        return {
          iconBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121215] rounded-3xl border border-slate-200 dark:border-[#27272a] shadow-2xl overflow-hidden p-6 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${styles.iconBg} shrink-0`}>
              {variant === 'danger' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : variant === 'primary' ? (
                <Database className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-1 ${styles.badge}`}>
                Konfirmasi Aksi Database
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>

        {/* Details Box if provided */}
        {details && details.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a] text-[11px] font-mono space-y-1.5">
            {details.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-300">{item.label}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isActuallyLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27272a] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isActuallyLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${styles.btnBg} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isActuallyLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
