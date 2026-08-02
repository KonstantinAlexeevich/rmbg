import { ArrowLeft, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activePreset } from '../../core/storage/settings';
import { useStudioStore } from '../state/store';
import { t } from '../state/i18n';
import { loadCompareUrls } from '../state/orchestrator';

type CompareUrls = {
  originalUrl: string;
  resultUrl: string;
  resultWidth: number;
  resultHeight: number;
};

const EMPTY: CompareUrls = {
  originalUrl: '',
  resultUrl: '',
  resultWidth: 0,
  resultHeight: 0,
};

function revokeUrls(urls: CompareUrls): void {
  URL.revokeObjectURL(urls.originalUrl);
  URL.revokeObjectURL(urls.resultUrl);
}

export function Viewer() {
  const compareItemId = useStudioStore((s) => s.compareItemId);
  const setCompareItemId = useStudioStore((s) => s.setCompareItemId);
  const items = useStudioStore((s) => s.items);
  const settings = useStudioStore((s) => s.settings);

  const [urls, setUrls] = useState<CompareUrls>(EMPTY);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const index = items.findIndex((i) => i.id === compareItemId);
  const item = index >= 0 ? items[index] : undefined;

  const aspectW = urls.resultWidth > 0 ? urls.resultWidth : (item?.width ?? 1);
  const aspectH = urls.resultHeight > 0 ? urls.resultHeight : (item?.height ?? 1);

  // вписываем холст в доступную область без искажения пропорций
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const update = () => {
      const { clientWidth: fw, clientHeight: fh } = frame;
      if (fw <= 0 || fh <= 0 || aspectW <= 0 || aspectH <= 0) return;
      const byWidth = fw;
      const byHeight = (fh * aspectW) / aspectH;
      const width = Math.min(byWidth, byHeight);
      const height = (width * aspectH) / aspectW;
      setStageSize((prev) =>
        Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
          ? prev
          : { width, height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [aspectW, aspectH, compareItemId]);

  // ключ layout: при смене пресета/края/слепка пересобираем оба кадра
  const layoutKey = useMemo(() => {
    const preset = activePreset(settings);
    const o = item?.override;
    const sizeMode = o?.sizeMode ?? preset.sizeMode;
    const canvas = o?.canvas ?? preset.canvas;
    const fit = o?.fit ?? preset.fit;
    const anchor = o?.anchor ?? preset.anchor;
    const edge = o?.edge ?? settings.edge;
    const background = o?.background ?? preset.background;
    return [
      settings.activePresetId,
      sizeMode,
      canvas.width,
      canvas.height,
      fit.margin.top,
      fit.margin.right,
      fit.margin.bottom,
      fit.margin.left,
      fit.mode,
      fit.allowUpscale ? 1 : 0,
      anchor,
      edge.threshold,
      edge.erode,
      edge.feather,
      background.kind === 'solid' ? background.color : 't',
    ].join('|');
  }, [settings, item?.override]);

  // смена картинки — сброс; смена настроек — держим старый кадр до готовности нового
  useEffect(() => {
    setSplit(50);
    revokeUrls(urlsRef.current);
    urlsRef.current = EMPTY;
    setUrls(EMPTY);
  }, [compareItemId]);

  useEffect(() => {
    if (compareItemId === '') return;
    let cancelled = false;
    // дебаунс как у recompose: слайдеры не должны каждый тик гонять compose
    const timer = window.setTimeout(() => {
      void loadCompareUrls(compareItemId).then((result) => {
        if (cancelled) {
          revokeUrls(result);
          return;
        }
        const prev = urlsRef.current;
        urlsRef.current = result;
        setUrls(result);
        // revoke после paint, чтобы img не потерял src на том же кадре
        requestAnimationFrame(() => revokeUrls(prev));
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [compareItemId, layoutKey]);

  useEffect(() => {
    return () => revokeUrls(urlsRef.current);
  }, []);

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
      const target = e.target as HTMLElement;
      const inField = target.tagName === 'INPUT' || target.tagName === 'SELECT';
      if (inField) return;
      if (e.key === 'Escape') setCompareItemId('');
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [compareItemId, navigate, setCompareItemId]);

  if (item === undefined || compareItemId === '') return null;

  const updateSplit = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-zinc-600">
        <span className="truncate font-medium text-zinc-800">{item.name}</span>
        <button
          type="button"
          onClick={() => setCompareItemId('')}
          aria-label={t('viewerBack')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('viewerBack')}
        </button>
      </div>

      <div ref={frameRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          ref={stageRef}
          className="checkerboard relative cursor-ew-resize touch-none overflow-hidden rounded-lg select-none"
          style={{
            width: stageSize.width > 0 ? stageSize.width : undefined,
            height: stageSize.height > 0 ? stageSize.height : undefined,
          }}
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
          {urls.originalUrl !== '' && (
            <img
              src={urls.originalUrl}
              alt={t('compareBefore')}
              className="absolute inset-0 h-full w-full"
              draggable={false}
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
          )}
          {urls.resultUrl !== '' && (
            <img
              src={urls.resultUrl}
              alt={t('compareAfter')}
              className="absolute inset-0 h-full w-full"
              draggable={false}
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
            />
          )}
          <div
            className="absolute top-0 bottom-0 flex -translate-x-1/2 items-center"
            style={{ left: `${split}%` }}
          >
            <div className="h-full w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.6)]" />
            <div className="absolute top-1/2 left-1/2 flex h-7 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white shadow">
              <GripVertical className="h-4 w-4 text-zinc-500" aria-hidden />
            </div>
          </div>
          <span className="absolute top-2 left-2 rounded bg-zinc-900/70 px-2 py-0.5 text-xs text-white">
            {t('compareBefore')}
          </span>
          <span className="absolute top-2 right-2 rounded bg-zinc-900/70 px-2 py-0.5 text-xs text-white">
            {t('compareAfter')}
          </span>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={index <= 0}
          aria-label={t('viewerPrev')}
          title={t('viewerPrev')}
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-white hover:bg-zinc-700 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={index >= items.length - 1}
          aria-label={t('viewerNext')}
          title={t('viewerNext')}
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-white hover:bg-zinc-700 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
