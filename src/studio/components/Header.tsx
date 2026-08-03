import { Cpu, Gauge, Zap } from 'lucide-react';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { ModelStatus } from './ModelStatus';

export function Header() {
  const backend = useStudioStore((s) => s.backend);
  const setDiagnosticsOpen = useStudioStore((s) => s.setDiagnosticsOpen);

  return (
    <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
      <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
        <img
          src={chrome.runtime.getURL('icons/icon-32.png')}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6"
          aria-hidden
        />
        {t('appName')}
      </span>

      <button
        type="button"
        onClick={() => setDiagnosticsOpen(true)}
        title={t('diagTitle')}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
          backend === 'webgpu'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-zinc-100 text-zinc-700'
        }`}
      >
        {backend === 'webgpu' ? (
          <Zap className="h-4 w-4" aria-hidden />
        ) : (
          <Cpu className="h-4 w-4" aria-hidden />
        )}
        {backend === 'webgpu' ? t('badgeGpu') : t('badgeCpu')}
        <Gauge className="h-4 w-4 opacity-60" aria-hidden />
      </button>

      <ModelStatus />
    </header>
  );
}
