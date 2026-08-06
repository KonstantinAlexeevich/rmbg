import { ImagePlus } from 'lucide-react';
import { t } from '../state/i18n';

export function EmptyState({ onChooseFiles }: { onChooseFiles: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
      <div
        data-testid="drop-zone"
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-(--radius-surface) border-2 border-dashed border-zinc-300 px-6 py-10 sm:px-16 sm:py-14"
      >
        <ImagePlus className="h-12 w-12 text-zinc-300" aria-hidden />
        <p className="text-lg font-medium text-zinc-700">{t.emptyTitle()}</p>
        <button type="button" onClick={onChooseFiles} className="btn-primary">
          {t.emptyChooseFiles()}
        </button>
        <p className="hidden text-sm text-zinc-500 sm:block">{t.emptyPasteHint()}</p>
      </div>
      <p className="max-w-md text-sm text-zinc-500">{t.emptyPrivacy()}</p>
    </div>
  );
}
