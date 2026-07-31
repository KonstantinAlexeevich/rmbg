import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { ModelStatus } from './ModelStatus';

export function Header() {
  const backend = useStudioStore((s) => s.backend);
  const setDiagnosticsOpen = useStudioStore((s) => s.setDiagnosticsOpen);

  return (
    <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
      <span className="text-lg font-bold tracking-tight text-zinc-900">
        {t('appName')}
      </span>

      <button
        type="button"
        onClick={() => setDiagnosticsOpen(true)}
        title={t('diagTitle')}
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          backend === 'webgpu'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {backend === 'webgpu' ? t('badgeGpu') : t('badgeCpu')}
      </button>

      <ModelStatus />
    </header>
  );
}
