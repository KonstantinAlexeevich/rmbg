import { CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useStudioStore, type Toast } from '../state/store';
import { t } from '../state/i18n';

const COLORS: Record<Toast['kind'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

function ToastIcon({ kind }: { kind: Toast['kind'] }): ReactNode {
  switch (kind) {
    case 'info':
      return <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />;
    case 'warning':
      return <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />;
    case 'error':
      return <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />;
  }
}

function ToastView({ toast }: { toast: Toast }) {
  const dismiss = useStudioStore((s) => s.dismissToast);

  useEffect(() => {
    if (toast.kind === 'error') return; // ошибки закрываются только вручную
    const timer = setTimeout(() => dismiss(toast.id), 8000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-(--radius-surface) border px-4 py-2.5 text-sm shadow-lg ${COLORS[toast.kind]}`}
    >
      <ToastIcon kind={toast.kind} />
      <span className="max-w-sm">{toast.text}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t('toastDismiss')}
        className="cursor-pointer opacity-60 hover:opacity-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useStudioStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
