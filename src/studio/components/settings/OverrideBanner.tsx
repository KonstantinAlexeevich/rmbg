import { t } from '../../state/i18n';
import { overrideCurrentItem, resetItemOverride } from '../../state/orchestrator';

export function OverrideBanner({
  itemId,
  itemName,
  presetName,
  editingOverride,
}: {
  itemId: string;
  itemName: string;
  presetName: string;
  editingOverride: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 border-b border-zinc-200 border-l-2 py-4 pr-4 pl-3.5 ${
        editingOverride ? 'border-l-blue-400' : 'border-l-transparent'
      }`}
    >
      <h3 className="truncate text-sm font-medium text-zinc-900" title={itemName}>
        {itemName}
      </h3>
      {editingOverride ? (
        <>
          <p className="text-xs text-zinc-500">{t('overrideActive')}</p>
          <button
            type="button"
            onClick={() => void resetItemOverride(itemId)}
            className="w-full cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t('overrideReset')}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {t('overrideEditingPreset', { name: presetName })}
          </p>
          <button
            type="button"
            onClick={() => void overrideCurrentItem(itemId)}
            className="w-full cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t('overrideCreate')}
          </button>
        </>
      )}
    </div>
  );
}
