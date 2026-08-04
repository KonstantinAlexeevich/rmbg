import {
  BRIDGE_SOURCE,
  type BridgeFromPage,
} from '../content/bridge-protocol';
import type { Settings } from '../core/storage/settings';

function postToBridge(message: BridgeFromPage): void {
  window.postMessage(message, window.location.origin);
}

export function syncExportsToExtension(settings: Settings): void {
  postToBridge({
    source: BRIDGE_SOURCE,
    type: 'SYNC_EXPORTS',
    exports: settings.presets.map((p) => ({ id: p.id, name: p.name })),
  });
}

export function postPageReady(): void {
  postToBridge({ source: BRIDGE_SOURCE, type: 'PAGE_READY' });
}
