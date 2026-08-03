import { ImagePlus } from 'lucide-react';
import { t } from '../state/i18n';

export function EmptyState({ onChooseFiles }: { onChooseFiles: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex flex-col items-center gap-3 rounded-(--radius-surface) border-2 border-dashed border-zinc-300 px-16 py-14">
        <ImagePlus className="h-12 w-12 text-zinc-300" aria-hidden />
        <p className="text-lg font-medium text-zinc-700">{t('emptyTitle')}</p>
        <button type="button" onClick={onChooseFiles} className="btn-primary">
          {t('emptyChooseFiles')}
        </button>
        <p className="text-sm text-zinc-500">{t('emptyPasteHint')}</p>
      </div>
      <p className="max-w-md text-sm text-zinc-500">{t('emptyPrivacy')}</p>
    </div>
  );
}
