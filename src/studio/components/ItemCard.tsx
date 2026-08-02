import { useEffect, useRef, useState } from 'react';
import { useStudioStore, type ItemView } from '../state/store';
import { t } from '../state/i18n';
import {
  deleteItem,
  downloadItem,
  renameItem,
  retryItem,
  setItemSelected,
} from '../state/orchestrator';

function StatusOverlay({ item }: { item: ItemView }) {
  switch (item.status) {
    case 'queued':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-xs text-white">
            {t('statusQueued')}
          </span>
        </div>
      );
    case 'segmenting':
    case 'composing':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        </div>
      );
    default:
      return null;
  }
}

export function ItemCard({ item }: { item: ItemView }) {
  const setCompareItemId = useStudioStore((s) => s.setCompareItemId);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);

  const previewUrl =
    item.status === 'done' && item.resultThumbnailUrl !== ''
      ? item.resultThumbnailUrl
      : item.thumbnailUrl;

  useEffect(() => {
    if (!renaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const startRename = () => {
    skipCommitRef.current = false;
    setDraft(item.name);
    setRenaming(true);
  };

  const commitRename = () => {
    setRenaming(false);
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    void renameItem(item.id, draft);
  };

  const cancelRename = () => {
    skipCommitRef.current = true;
    setRenaming(false);
    setDraft(item.name);
  };

  return (
    <div
      data-item-id={item.id}
      tabIndex={0}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter') setCompareItemId(item.id);
      }}
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 ${
        item.status === 'failed' ? 'border-red-400' : 'border-zinc-200'
      } ${item.stale && item.status === 'done' ? 'opacity-70' : ''}`}
    >
      <div className="checkerboard relative aspect-square">
        <img
          src={previewUrl}
          alt={item.name}
          className={`h-full w-full object-contain ${item.status === 'queued' ? 'opacity-50' : ''}`}
        />
        <StatusOverlay item={item} />

        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => void setItemSelected(item.id, e.target.checked)}
          aria-label={item.name}
          className="absolute top-2 left-2 h-4 w-4 accent-blue-600"
        />

        {item.maskEmpty && (
          <div className="absolute right-0 bottom-0 left-0 bg-amber-400/90 px-2 py-0.5 text-center text-xs font-medium text-amber-950">
            {t('cardEmptyMask')}
          </div>
        )}

        {item.override !== null && (
          <span
            title={t('cardOverride')}
            aria-label={t('cardOverride')}
            className="absolute top-2 left-8 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >
            ✎
          </span>
        )}

        <div className="absolute top-2 right-2 flex gap-1">
          {item.status === 'done' && (
            <>
              <IconButton
                label={t('cardZoom')}
                onClick={() => setCompareItemId(item.id)}
                icon="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"
              />
              <IconButton
                label={t('cardDownload')}
                onClick={() => void downloadItem(item.id)}
                icon="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"
              />
            </>
          )}
          <IconButton
            label={t('cardRename')}
            onClick={startRename}
            icon="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          />
          <IconButton
            label={t('cardDelete')}
            onClick={() => void deleteItem(item.id)}
            icon="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        {renaming ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            aria-label={t('cardRename')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
              }
            }}
            className="w-full rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-700 outline-none focus:border-blue-400"
          />
        ) : (
          <span className="truncate text-xs text-zinc-700" title={item.name}>
            {item.name}
          </span>
        )}
        {item.status === 'failed' && (
          <>
            <span className="truncate text-xs text-red-600" title={item.error}>
              {item.error}
            </span>
            <button
              type="button"
              onClick={() => void retryItem(item.id)}
              className="self-start text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              {t('cardRetry')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md bg-zinc-900/70 p-1.5 text-white hover:bg-zinc-900"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d={icon} />
      </svg>
    </button>
  );
}
