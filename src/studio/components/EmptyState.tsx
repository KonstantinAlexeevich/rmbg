import { t } from '../state/i18n';

export function EmptyState({ onChooseFiles }: { onChooseFiles: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 px-16 py-14">
        <svg viewBox="0 0 24 24" className="h-12 w-12 fill-zinc-300">
          <path d="M19 5v14H5V5h14m0-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-4.86 8.86-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
        </svg>
        <p className="text-lg font-medium text-zinc-700">{t('emptyTitle')}</p>
        <button
          type="button"
          onClick={onChooseFiles}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {t('emptyChooseFiles')}
        </button>
        <p className="text-sm text-zinc-500">{t('emptyPasteHint')}</p>
      </div>
      <p className="max-w-md text-sm text-zinc-500">{t('emptyPrivacy')}</p>
    </div>
  );
}
