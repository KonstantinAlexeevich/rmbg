// Единственная задача service worker в MV3: по клику на иконку открыть
// или сфокусировать вкладку студии. Никакой обработки изображений здесь:
// SW засыпает, и WebGPU в нём недоступен.
const STUDIO_URL = chrome.runtime.getURL('studio.html');

chrome.action.onClicked.addListener(() => {
  void openStudio();
});

async function openStudio(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: STUDIO_URL });
  const existing = tabs[0];
  if (existing !== undefined && existing.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url: STUDIO_URL });
}
