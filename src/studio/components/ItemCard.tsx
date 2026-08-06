import {
  Download,
  Expand,
  Pencil,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Wand2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
          <span className="rounded-(--radius-control) bg-zinc-800/80 px-2 py-0.5 text-xs text-white">
            {t.statusQueued()}
          </span>
        </div>
      );
    case 'segmenting':
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          <span className="rounded-(--radius-control) bg-zinc-800/80 px-2 py-0.5 text-xs text-white">
            {t.statusSegmenting()}
          </span>
        </div>
      );
    case 'composing':
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          <span className="rounded-(--radius-control) bg-zinc-800/80 px-2 py-0.5 text-xs text-white">
            {t.statusComposing()}
          </span>
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
      data-testid="item-card"
      data-status={item.status}
      tabIndex={0}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter') setCompareItemId(item.id);
      }}
      className={`relative flex flex-col overflow-hidden rounded-(--radius-surface) border bg-white shadow-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-500 ${
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

        <label className="absolute top-2 left-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-(--radius-control) bg-white/80 shadow-sm">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(e) => void setItemSelected(item.id, e.target.checked)}
            aria-label={t.cardSelect({ name: item.name })}
            className="h-4 w-4 accent-blue-600"
          />
        </label>

        {item.maskEmpty && (
          <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center gap-1 bg-amber-400/90 px-2 py-0.5 text-center text-xs font-medium text-amber-950">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {t.cardEmptyMask()}
          </div>
        )}

        {item.override !== null && (
          <span
            title={t.cardOverride()}
            aria-label={t.cardOverride()}
            className="absolute top-2 left-10 rounded-(--radius-control) bg-blue-600 p-1 text-white"
          >
            <Wand2 className="h-4 w-4" aria-hidden />
          </span>
        )}

        <div className="absolute top-2 right-2 flex gap-1">
          {item.status === 'done' && (
            <>
              <IconButton
                label={t.cardOpenPreview()}
                onClick={() => setCompareItemId(item.id)}
              >
                <Expand className="h-4 w-4" aria-hidden />
              </IconButton>
              <IconButton
                label={t.cardDownload()}
                onClick={() => void downloadItem(item.id)}
              >
                <Download className="h-4 w-4" aria-hidden />
              </IconButton>
            </>
          )}
          <IconButton label={t.cardRename()} onClick={startRename}>
            <Pencil className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            label={t.cardDelete()}
            onClick={() => void deleteItem(item.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        {renaming ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            aria-label={t.cardRename()}
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
            className="field w-full text-xs text-zinc-700"
          />
        ) : (
          <span className="truncate text-xs text-zinc-700" title={item.name}>
            {item.name}
          </span>
        )}
        {item.status === 'done' && (
          <span className="text-xs text-zinc-400">{t.statusDone()}</span>
        )}
        {item.status === 'failed' && (
          <>
            <span className="truncate text-xs text-red-600" title={item.error}>
              {item.error !== '' ? item.error : t.statusFailed()}
            </span>
            <button
              type="button"
              onClick={() => void retryItem(item.id)}
              className="inline-flex cursor-pointer items-center gap-1 self-start text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t.cardRetry()}
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
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="cursor-pointer rounded-(--radius-control) bg-zinc-900/70 p-1.5 text-white hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      {children}
    </button>
  );
}
