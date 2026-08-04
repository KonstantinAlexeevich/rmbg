import { isExtension } from './env';

export async function downloadBlob(
  blob: Blob,
  filename: string,
  saveAs: boolean,
): Promise<void> {
  if (isExtension) {
    await downloadViaChrome(blob, filename, saveAs);
    return;
  }
  await downloadViaWeb(blob, filename, saveAs);
}

async function downloadViaChrome(
  blob: Blob,
  filename: string,
  saveAs: boolean,
): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    const downloadId = await chrome.downloads.download({ url, filename, saveAs });
    // ранний revoke ломает скачивание больших архивов — ждём завершения
    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return;
      const state = delta.state?.current;
      if (state === 'complete' || state === 'interrupted') {
        URL.revokeObjectURL(url);
        chrome.downloads.onChanged.removeListener(listener);
      }
    };
    chrome.downloads.onChanged.addListener(listener);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function downloadViaWeb(
  blob: Blob,
  filename: string,
  saveAs: boolean,
): Promise<void> {
  const savePicker = (
    window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
      }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;

  if (saveAs && savePicker !== undefined) {
    try {
      const handle = await savePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // иначе fallback на <a download>
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // даём браузеру начать скачивание до revoke
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
