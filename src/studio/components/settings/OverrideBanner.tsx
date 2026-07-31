import { t } from '../../state/i18n';
import { overrideCurrentItem, resetItemOverride } from '../../state/orchestrator';

export function OverrideBanner({
  itemId,
  itemName,
  editingOverride,
}: {
  itemId: string;
  itemName: string;
  editingOverride: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
      <span className="truncate text-xs text-zinc-500" title={itemName}>
        {itemName}
      </span>
      {editingOverride ? (
        <div className="flex flex-col gap-1.5">
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {t('overrideActive')}
          </span>
          <button
            type="button"
            onClick={() => void resetItemOverride(itemId)}
            className="self-start text-xs text-blue-600 hover:underline"
          >
            {t('overrideReset')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void overrideCurrentItem(itemId)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          {t('overrideCreate')}
        </button>
      )}
    </div>
  );
}
