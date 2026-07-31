import { useEffect, useRef, useState } from 'react';
import { useStudioStore } from './state/store';
import { t } from './state/i18n';
import { addFiles, deleteSelected, selectAll } from './state/orchestrator';
import { ACCEPTED_MIME_TYPES } from '../core/image/decode';
import { Header } from './components/Header';
import { Grid } from './components/Grid';
import { EmptyState } from './components/EmptyState';
import { SettingsPanel } from './components/SettingsPanel';
import { BottomBar } from './components/BottomBar';
import { Viewer } from './components/Viewer';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ExportPresetsModal } from './components/ExportPresetsModal';
import { Toasts } from './components/Toasts';

export function App() {
  const items = useStudioStore((s) => s.items);
  const compareItemId = useStudioStore((s) => s.compareItemId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // вставка из буфера и клавиатура — на уровне документа
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length > 0) void addFiles(files);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target.tagName === 'INPUT' || target.tagName === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !inField) {
        e.preventDefault();
        void selectAll();
      }
      if (e.key === 'Delete' && !inField && compareItemId === '') {
        const selected = useStudioStore.getState().items.filter((i) => i.selected);
        if (selected.length > 0 && window.confirm(t('confirmDeleteSelected'))) {
          void deleteSelected();
        }
      }
    };
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [compareItemId]);

  return (
    <div
      className="flex h-screen flex-col bg-zinc-50 text-zinc-900"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void addFiles([...e.dataTransfer.files]);
      }}
    >
      <Header />

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          {compareItemId !== '' ? (
            <Viewer />
          ) : items.length === 0 ? (
            <EmptyState onChooseFiles={() => fileInputRef.current?.click()} />
          ) : (
            <Grid />
          )}
          {dragOver && compareItemId === '' && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-4 border-dashed border-blue-400 bg-blue-100/60">
              <span className="rounded-xl bg-white px-6 py-3 text-lg font-medium text-blue-700 shadow">
                {t('emptyTitle')}
              </span>
            </div>
          )}
        </main>
        <SettingsPanel />
      </div>

      <BottomBar />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />

      <DiagnosticsPanel />
      <ExportPresetsModal />
      <Toasts />
    </div>
  );
}
