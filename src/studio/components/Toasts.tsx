import { useEffect } from 'react';
import { useStudioStore, type Toast } from '../state/store';

const COLORS: Record<Toast['kind'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

function ToastView({ toast }: { toast: Toast }) {
  const dismiss = useStudioStore((s) => s.dismissToast);

  useEffect(() => {
    if (toast.kind === 'error') return; // ошибки закрываются только вручную
    const timer = setTimeout(() => dismiss(toast.id), 8000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg ${COLORS[toast.kind]}`}
    >
      <span className="max-w-sm">{toast.text}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Закрыть"
        className="opacity-60 hover:opacity-100"
      >
        ✕
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
