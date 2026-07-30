import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { loadCompareUrls } from '../state/orchestrator';

export function CompareModal() {
  const compareItemId = useStudioStore((s) => s.compareItemId);
  const setCompareItemId = useStudioStore((s) => s.setCompareItemId);
  const items = useStudioStore((s) => s.items);

  const [urls, setUrls] = useState({ originalUrl: '', resultUrl: '' });
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const index = items.findIndex((i) => i.id === compareItemId);
  const item = index >= 0 ? items[index] : undefined;
  // пересобираем cutout при смене края, пока модалка открыта
  const edge = useStudioStore((s) => s.settings.edge);

  useEffect(() => {
    if (compareItemId === '') return;
    setSplit(50);
  }, [compareItemId]);

  useEffect(() => {
    if (compareItemId === '') return;
    let cancelled = false;
    let loaded = { originalUrl: '', resultUrl: '' };
    void loadCompareUrls(compareItemId).then((result) => {
      if (cancelled) {
        URL.revokeObjectURL(result.originalUrl);
        URL.revokeObjectURL(result.resultUrl);
        return;
      }
      loaded = result;
      setUrls(result);
    });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(loaded.originalUrl);
      URL.revokeObjectURL(loaded.resultUrl);
      setUrls({ originalUrl: '', resultUrl: '' });
    };
  }, [compareItemId, edge.threshold, edge.erode, edge.feather]);

  const navigate = useCallback(
    (delta: number) => {
      const next = items[index + delta];
      if (next !== undefined) setCompareItemId(next.id);
    },
    [items, index, setCompareItemId],
  );

  useEffect(() => {
    if (compareItemId === '') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompareItemId('');
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [compareItemId, navigate, setCompareItemId]);

  if (item === undefined || compareItemId === '') return null;

  const updateSplit = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/90 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCompareItemId('');
      }}
    >
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-300">
        <span className="truncate">{item.name}</span>
        <button
          type="button"
          onClick={() => setCompareItemId('')}
          aria-label="Esc"
          className="rounded px-2 py-1 hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      <div
        ref={containerRef}
        className="checkerboard relative mx-auto min-h-0 flex-1 cursor-ew-resize touch-none overflow-hidden rounded-lg select-none"
        style={{ aspectRatio: `${item.width} / ${item.height}`, maxWidth: '100%' }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateSplit(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) updateSplit(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {/* Каждая сторона клипается отдельно: иначе прозрачный PNG «после»
            лежит поверх оригинала и тот просвечивает сквозь фон. */}
        {urls.originalUrl !== '' && (
          <img
            src={urls.originalUrl}
            alt={t('compareBefore')}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />
        )}
        {urls.resultUrl !== '' && (
          <img
            src={urls.resultUrl}
            alt={t('compareAfter')}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
            style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          />
        )}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.6)]"
          style={{ left: `${split}%` }}
        />
        <span className="absolute top-2 left-2 rounded bg-zinc-900/70 px-2 py-0.5 text-xs text-white">
          {t('compareBefore')}
        </span>
        <span className="absolute top-2 right-2 rounded bg-zinc-900/70 px-2 py-0.5 text-xs text-white">
          {t('compareAfter')}
        </span>
      </div>

      <div className="mt-3 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={index <= 0}
          aria-label="←"
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-white hover:bg-zinc-700 disabled:opacity-30"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={index >= items.length - 1}
          aria-label="→"
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-white hover:bg-zinc-700 disabled:opacity-30"
        >
          →
        </button>
      </div>
    </div>
  );
}
